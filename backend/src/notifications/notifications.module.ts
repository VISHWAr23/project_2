// User instruction: "Phase 11: Notifications - Create NotificationsModule registering schemas, controller, and providers"
// Importers/callers: backend/src/app.module.ts, orders.module.ts, expenses.module.ts, incentives.module.ts
// Affected API: /api/notifications
// Data schemas: Notification, NotificationSchema, User, UserSchema

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
