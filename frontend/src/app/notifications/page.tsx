// User instruction: "NOW I ONLY WANT TWO THINGS: 1. Make the ENTIRE APPLICATION fully responsive and mobile-friendly. 2. Add a proper Light Theme + Dark Theme with a theme switcher."
// Importers/callers: Next.js App Router (/notifications), Header notification bell navigation from dashboard
// Affected API: /api/notifications (list, markAsRead, markAllAsRead, getUnreadCount)
// Data schemas: Notification, NotificationType, NotificationReferenceType, NotificationListResponse, NotificationQueryParams, MarkAllAsReadResponse

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { notificationsApi } from '@/lib/api/notifications';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Receipt,
  Award,
  Clock,
  RefreshCw,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/types/notification.types';

export default function NotificationsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  // Protect route
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Query notifications list
  const {
    data: notificationsData,
    isLoading: isNotificationsLoading,
    isFetching: isNotificationsFetching,
    refetch,
  } = useQuery({
    queryKey: ['notifications', 'list', activeTab, page],
    queryFn: () =>
      notificationsApi.list({
        page,
        limit,
        isRead: activeTab === 'unread' ? false : undefined,
      }),
    enabled: !!user,
  });

  // Query unread count for badge sync
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: !!user,
  });

  // Mutation: Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mutation: Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (authLoading || (!user && isAuthenticated)) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Loading notifications...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'ORDER_SUBMITTED':
        return <ShoppingBag className="size-5 text-sky-500" />;
      case 'ORDER_APPROVED':
        return <CheckCircle2 className="size-5 text-emerald-500" />;
      case 'ORDER_REJECTED':
        return <XCircle className="size-5 text-rose-500" />;
      case 'EXPENSE_SUBMITTED':
        return <Receipt className="size-5 text-amber-500" />;
      case 'EXPENSE_APPROVED':
        return <CheckCircle2 className="size-5 text-emerald-500" />;
      case 'EXPENSE_REJECTED':
        return <XCircle className="size-5 text-rose-500" />;
      case 'INCENTIVE_GENERATED':
        return <Award className="size-5 text-purple-500" />;
      default:
        return <Bell className="size-5 text-muted-foreground" />;
    }
  };

  const getNotificationBadge = (type: NotificationType) => {
    switch (type) {
      case 'ORDER_SUBMITTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            Order Submitted
          </span>
        );
      case 'ORDER_APPROVED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Order Approved
          </span>
        );
      case 'ORDER_REJECTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Order Rejected
          </span>
        );
      case 'EXPENSE_SUBMITTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Expense Submitted
          </span>
        );
      case 'EXPENSE_APPROVED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Expense Approved
          </span>
        );
      case 'EXPENSE_REJECTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Expense Rejected
          </span>
        );
      case 'INCENTIVE_GENERATED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Incentive Earned
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
            Notification
          </span>
        );
    }
  };

  const items = notificationsData?.items || [];
  const total = notificationsData?.total || 0;
  const totalPages = notificationsData?.totalPages || 1;
  const unreadCount = unreadData?.count || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications & Alerts"
        subtitle="Live event stream for order status changes, expense reimbursements, and incentive rewards."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isNotificationsFetching}
            className="gap-1.5 text-xs text-foreground bg-card border-border"
          >
            <RefreshCw
              className={`size-3.5 ${isNotificationsFetching ? 'animate-spin text-primary' : ''}`}
            />
            <span>Refresh</span>
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <CheckCheck className="size-3.5" />
              <span>Mark all read</span>
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Filter Tabs Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab('all');
                setPage(1);
              }}
              className="text-xs font-semibold"
            >
              All Notifications
            </Button>
            <Button
              variant={activeTab === 'unread' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab('unread');
                setPage(1);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white leading-none">
                  {unreadCount}
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List Card */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground font-heading">
                {activeTab === 'all' ? 'All Activity Feed' : 'Unread Notifications'}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Showing {items.length} of {total} notifications
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-border/60">
          {isNotificationsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading notifications...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Inbox}
                title={activeTab === 'unread' ? 'All caught up!' : 'No notifications yet'}
                description={
                  activeTab === 'unread'
                    ? 'You have read all your notifications. Switch to "All Notifications" to view your history.'
                    : 'System alerts and activity updates regarding orders, expenses, and incentives will appear here.'
                }
              />
            </div>
          ) : (
            items.map((notification: Notification) => (
              <div
                key={notification._id}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 transition-colors ${
                  !notification.isRead
                    ? 'bg-primary/5 hover:bg-primary/10'
                    : 'hover:bg-muted/40'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5 border border-border">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getNotificationBadge(notification.type)}
                      <span className="text-xs font-semibold text-foreground">
                        {notification.title}
                      </span>
                      {!notification.isRead && (
                        <span className="size-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground break-words leading-relaxed">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="size-3" />
                        {formatDate(notification.createdAt)}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[10px]">
                        Ref: {notification.referenceType} #{notification.referenceId.slice(-6)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Item Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsReadMutation.mutate(notification._id)}
                      disabled={markAsReadMutation.isPending}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                      title="Mark as read"
                    >
                      <Check className="size-3.5 mr-1" />
                      Mark read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard')}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="View on Dashboard"
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="gap-1 text-xs text-foreground bg-card border-border"
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="gap-1 text-xs text-foreground bg-card border-border"
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
