// User instruction: "Phase 11: Notifications - Controller for in-app notification API endpoints"
// Importers/callers: backend/src/notifications/notifications.module.ts (controllers registration)
// Affected API: GET /notifications, GET /notifications/unread-count, PATCH /notifications/:id/read, PATCH /notifications/read-all
// Data schemas: Notification (userId, type, title, message, referenceType, referenceId, isRead, timestamps)

import { Controller, Get, Patch, Param, Query, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { QueryNotificationDto } from './dto/query-notification.dto.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Query() query: QueryNotificationDto, @Req() req: any) {
    return this.notificationsService.findAll(query, req.user);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user);
    return { count };
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const modifiedCount = await this.notificationsService.markAllAsRead(
      req.user,
    );
    return { modifiedCount };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.markAsRead(id, req.user);
  }
}
