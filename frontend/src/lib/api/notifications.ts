// User instruction: "Phase 11: Notifications - Create frontend notifications API client"
// Importers/callers: frontend/src/app/notifications/page.tsx, frontend/src/app/dashboard/page.tsx
// Affected API: /api/notifications (list, getUnreadCount, markAsRead, markAllAsRead)
// Data schemas: Notification, NotificationListResponse, NotificationQueryParams, UnreadCountResponse, MarkAllAsReadResponse

import apiClient from '../api-client';
import type {
  Notification,
  NotificationListResponse,
  NotificationQueryParams,
  UnreadCountResponse,
  MarkAllAsReadResponse,
} from '@/types/notification.types';

export const notificationsApi = {
  list: async (
    params?: NotificationQueryParams,
  ): Promise<NotificationListResponse> => {
    const response = await apiClient.get<NotificationListResponse>(
      '/notifications',
      { params },
    );
    return response.data;
  },

  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await apiClient.get<UnreadCountResponse>(
      '/notifications/unread-count',
    );
    return response.data;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const response = await apiClient.patch<Notification>(
      `/notifications/${id}/read`,
    );
    return response.data;
  },

  markAllAsRead: async (): Promise<MarkAllAsReadResponse> => {
    const response = await apiClient.patch<MarkAllAsReadResponse>(
      '/notifications/read-all',
    );
    return response.data;
  },
};
