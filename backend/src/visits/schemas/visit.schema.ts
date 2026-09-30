// User instruction: "Phase 5: Customer Visit Management - Create Visit schema with Customer and User references"
// Importers/callers: visits.service.ts, visits.module.ts
// Affected API: /api/visits endpoints (CRUD operations with RBAC enforcement)
// Data schemas: Visit (customer ref to Customer, employee ref to User, visitDate, purpose, notes, result, followUpDate, photoUrl, latitude, longitude, timestamps)

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Visit extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  employee: Types.ObjectId;

  @Prop({ required: true, type: Date })
  visitDate: Date;

  @Prop({ required: true, trim: true })
  purpose: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ required: true, trim: true })
  result: string;

  @Prop({ type: Date })
  followUpDate?: Date;

  @Prop({ trim: true })
  photoUrl?: string;

  @Prop({ type: Number, min: -90, max: 90 })
  latitude?: number;

  @Prop({ type: Number, min: -180, max: 180 })
  longitude?: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);

// Compound and single field indexes for query performance
VisitSchema.index({ employee: 1, visitDate: -1 }); // Employee's visits sorted by visit date
VisitSchema.index({ customer: 1, visitDate: -1 }); // Customer visit history
VisitSchema.index({ visitDate: -1 }); // Admin all visits sorted by date / date range filtering
VisitSchema.index({ employee: 1, customer: 1, visitDate: -1 }); // Combined employee & customer queries
