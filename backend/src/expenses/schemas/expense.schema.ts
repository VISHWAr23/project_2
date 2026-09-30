// User instruction: "Phase 8: Expense Management - Create Expense schema with User reference, ExpenseType, and ExpenseStatus"
// Importers/callers: backend/src/expenses/expenses.service.ts, backend/src/expenses/expenses.module.ts
// Affected API: /api/expenses endpoints (CRUD, list, details, approve, reject)
// Data schemas: Expense, ExpenseType (FUEL, TRAVEL, FOOD, ACCOMMODATION, OTHER), ExpenseStatus (PENDING, APPROVED, REJECTED)

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ExpenseType {
  FUEL = 'FUEL',
  TRAVEL = 'TRAVEL',
  FOOD = 'FOOD',
  ACCOMMODATION = 'ACCOMMODATION',
  OTHER = 'OTHER',
}

export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export type ExpenseDocument = Expense & Document;

@Schema({ timestamps: true })
export class Expense extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  employee: Types.ObjectId;

  @Prop({ required: true, type: Date, default: Date.now })
  date: Date;

  @Prop({
    type: String,
    enum: Object.values(ExpenseType),
    required: true,
  })
  type: ExpenseType;

  @Prop({ required: true, type: Number, min: 0.01 })
  amount: number;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ trim: true })
  receiptUrl?: string;

  @Prop({
    type: String,
    enum: Object.values(ExpenseStatus),
    default: ExpenseStatus.PENDING,
    required: true,
  })
  status: ExpenseStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ trim: true })
  rejectionReason?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

// Compound and single field indexes for optimal query and sorting performance
ExpenseSchema.index({ employee: 1, date: -1 });
ExpenseSchema.index({ employee: 1, createdAt: -1 });
ExpenseSchema.index({ status: 1, createdAt: -1 });
ExpenseSchema.index({ type: 1, createdAt: -1 });
ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ createdAt: -1 });
ExpenseSchema.index({ employee: 1, status: 1, date: -1 });
