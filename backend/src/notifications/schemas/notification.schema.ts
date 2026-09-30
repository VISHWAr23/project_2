import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum NotificationType {
  ORDER_SUBMITTED = 'ORDER_SUBMITTED',
  ORDER_APPROVED = 'ORDER_APPROVED',
  ORDER_REJECTED = 'ORDER_REJECTED',
  EXPENSE_SUBMITTED = 'EXPENSE_SUBMITTED',
  EXPENSE_APPROVED = 'EXPENSE_APPROVED',
  EXPENSE_REJECTED = 'EXPENSE_REJECTED',
  INCENTIVE_GENERATED = 'INCENTIVE_GENERATED',
}

export enum NotificationReferenceType {
  ORDER = 'ORDER',
  EXPENSE = 'EXPENSE',
  INCENTIVE = 'INCENTIVE',
}

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(NotificationType),
    required: true,
  })
  type: NotificationType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({
    type: String,
    enum: Object.values(NotificationReferenceType),
    required: true,
  })
  referenceType: NotificationReferenceType;

  @Prop({ type: Types.ObjectId, required: true })
  referenceId: Types.ObjectId;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Duplicate prevention: one notification per type+reference+user
NotificationSchema.index(
  { type: 1, referenceId: 1, userId: 1 },
  { unique: true },
);

// Query index: user's notifications sorted by date, filterable by read status
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
