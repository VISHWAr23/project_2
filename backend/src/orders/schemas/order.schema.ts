// User instruction: "Phase 6: Order Management - Create Order schema with Customer, User references and Order Items"
// Importers/callers: orders.service.ts, orders.module.ts
// Affected API: /api/orders endpoints (CRUD and approval workflows)
// Data schemas: Order, OrderItem, OrderStatus (PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED)

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum OrderStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true, trim: true })
  productName: string;

  @Prop({ required: true, type: Number, min: 1 })
  quantity: number;

  @Prop({ required: true, type: Number, min: 0 })
  unitPrice: number;

  @Prop({ required: true, type: Number, min: 0 })
  totalPrice: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  employee: Types.ObjectId;

  @Prop({ required: true, type: Date, default: Date.now })
  orderDate: Date;

  @Prop({
    type: [OrderItemSchema],
    required: true,
    validate: [
      (val: OrderItem[]) => val.length > 0,
      'Order must contain at least one item',
    ],
  })
  items: OrderItem[];

  @Prop({ required: true, type: Number, min: 0 })
  totalAmount: number;

  @Prop({ trim: true })
  notes?: string;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
    required: true,
  })
  status: OrderStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ trim: true })
  rejectionReason?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Optimized compound and single field indexes for query performance
OrderSchema.index({ employee: 1, orderDate: -1 }); // Employee order list sorted by date
OrderSchema.index({ customer: 1, orderDate: -1 }); // Customer order history sorted by date
OrderSchema.index({ status: 1, orderDate: -1 }); // Status filter combined with date sort
OrderSchema.index({ orderDate: -1 }); // Date range queries and default sort
OrderSchema.index({ employee: 1, status: 1, orderDate: -1 }); // Employee specific status filter queries
