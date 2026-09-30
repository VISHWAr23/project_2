// User instruction: "Phase 11: Notifications - Create frontend notification types, interfaces, query params, and responses"
// Importers/callers: frontend/src/lib/api/notifications.ts, frontend/src/app/notifications/page.tsx, frontend/src/app/dashboard/page.tsx
// Affected API: Frontend Notification TypeScript interfaces
// Data schemas: Notification, NotificationType, NotificationReferenceType, NotificationQueryParams, NotificationListResponse, UnreadCountResponse, MarkAllAsReadResponse

export type NotificationType =
  | 'ORDER_SUBMITTED'
  | 'ORDER_APPROVED'
  | 'ORDER_REJECTED'
  | 'EXPENSE_SUBMITTED'
  | 'EXPENSE_APPROVED'
  | 'EXPENSE_REJECTED'
  | 'INCENTIVE_GENERATED';

export type NotificationReferenceType = 'ORDER' | 'EXPENSE' | 'INCENTIVE';

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceType: NotificationReferenceType;
  referenceId: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkAllAsReadResponse {
  modifiedCount: number;
}
