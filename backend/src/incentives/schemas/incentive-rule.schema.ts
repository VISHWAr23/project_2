// User instruction: "Phase 7: Employee Incentive Management - Create IncentiveRule configuration"
// Importers/callers: backend/src/incentives/incentives.service.ts, backend/src/incentives/incentives.module.ts
// Affected API: /api/incentives/rules
// Data schemas: IncentiveRule (percentage, isActive, createdAt, updatedAt)

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type IncentiveRuleDocument = IncentiveRule & Document;

@Schema({ timestamps: true })
export class IncentiveRule extends Document {
  @Prop({ required: true, type: Number, min: 0, max: 100 })
  percentage: number;

  @Prop({ required: true, type: Boolean, default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const IncentiveRuleSchema = SchemaFactory.createForClass(IncentiveRule);

// Performance index for active rule lookup
IncentiveRuleSchema.index({ isActive: 1 });
