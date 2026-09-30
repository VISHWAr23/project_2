// User instruction: "Phase 4: Customer Management - Create Customer schema with User reference for assignedEmployee"
// Importers/callers: customers.service.ts, customers.module.ts
// Affected API: /api/customers endpoints (CRUD operations with RBAC enforcement)
// Data schemas: Customer (customerName, businessName, phone, address, assignedEmployee ref to User, status enum, timestamps)

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Schema({ timestamps: true })
export class Customer extends Document {
  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  businessName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  address: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedEmployee: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(CustomerStatus),
    default: CustomerStatus.ACTIVE,
  })
  status: CustomerStatus;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Indexes for performance
CustomerSchema.index({ assignedEmployee: 1, status: 1, createdAt: -1 }); // Employee's customer list with sort
CustomerSchema.index({ status: 1, createdAt: -1 }); // Admin filtering by status
CustomerSchema.index({ phone: 1 }); // Search by phone
CustomerSchema.index({ customerName: 1 }); // Search by customer name
CustomerSchema.index({ businessName: 1 }); // Search by business name
