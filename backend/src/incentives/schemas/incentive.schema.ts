// User instruction: "Phase 7: Employee Incentive Management - Create Incentive schema"
// Importers/callers: backend/src/incentives/incentives.service.ts, backend/src/incentives/incentives.module.ts
// Affected API: /api/incentives (findAll, findById, findByOrderId, markAsPaid, generateIncentiveForOrder)
// Data schemas: Incentive, IncentiveStatus enum ('UNPAID', 'PAID')

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum IncentiveStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
}

export type IncentiveDocument = Incentive & Document;

@Schema({ timestamps: true })
export class Incentive extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, unique: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true, type: Number, min: 0 })
  orderAmount: number;

  @Prop({ required: true, type: Number, min: 0, max: 100 })
  percentage: number;

  @Prop({ required: true, type: Number, min: 0 })
  incentiveAmount: number;

  @Prop({
    type: String,
    enum: Object.values(IncentiveStatus),
    default: IncentiveStatus.UNPAID,
    required: true,
  })
  status: IncentiveStatus;

  @Prop({ type: Date })
  paidAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const IncentiveSchema = SchemaFactory.createForClass(Incentive);

// Performance and uniqueness indexes
// An order must have at most one incentive: unique index on orderId
IncentiveSchema.index({ orderId: 1 }, { unique: true });
IncentiveSchema.index({ employeeId: 1, createdAt: -1 });
IncentiveSchema.index({ status: 1, createdAt: -1 });
IncentiveSchema.index({ createdAt: -1 });
