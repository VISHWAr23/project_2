import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(UserRole),
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for performance and security
UserSchema.index({ email: 1 }, { unique: true }); // Login queries
UserSchema.index({ role: 1, isActive: 1, createdAt: -1 }); // Employee listing with active filter & sort
UserSchema.index({ role: 1, name: 1 }); // Search by name within role
UserSchema.index({ role: 1, phone: 1 }); // Search by phone within role
UserSchema.index({ isActive: 1, role: 1 }); // Admin filtering active users by role
UserSchema.index({ role: 1 }); // Role-based queries

// Ensure passwordHash is never returned in queries by default
UserSchema.set('toJSON', {
  transform: function (doc, ret: Record<string, any>) {
    delete ret.passwordHash;
    return ret;
  },
});
