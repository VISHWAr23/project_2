// User instruction: "Phase 11: Notifications - Create the Notifications page with All/Unread tabs, pagination, mark-as-read actions, and real-time refetching"
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
  ArrowLeft,
  RefreshCw,
  Inbox,
  Shield,
  Briefcase,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/types/notification.types';

export default function NotificationsPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  const isAdmin = user?.role === 'ADMIN';

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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
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
        return <ShoppingBag className="size-5 text-blue-600 dark:text-blue-400" />;
      case 'ORDER_APPROVED':
        return <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />;
      case 'ORDER_REJECTED':
        return <XCircle className="size-5 text-rose-600 dark:text-rose-400" />;
      case 'EXPENSE_SUBMITTED':
        return <Receipt className="size-5 text-amber-600 dark:text-amber-400" />;
      case 'EXPENSE_APPROVED':
        return <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />;
      case 'EXPENSE_REJECTED':
        return <XCircle className="size-5 text-rose-600 dark:text-rose-400" />;
      case 'INCENTIVE_GENERATED':
        return <Award className="size-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <Bell className="size-5 text-zinc-600 dark:text-zinc-400" />;
    }
  };

  const getNotificationBadge = (type: NotificationType) => {
    switch (type) {
      case 'ORDER_SUBMITTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            Order Submitted
          </span>
        );
      case 'ORDER_APPROVED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            Order Approved
          </span>
        );
      case 'ORDER_REJECTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            Order Rejected
          </span>
        );
      case 'EXPENSE_SUBMITTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            Expense Submitted
          </span>
        );
      case 'EXPENSE_APPROVED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            Expense Approved
          </span>
        );
      case 'EXPENSE_REJECTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            Expense Rejected
          </span>
        );
      case 'INCENTIVE_GENERATED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            Incentive Earned
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                L
              </div>
              <div>
                <h1 className="text-sm font-bold leading-none text-zinc-900 dark:text-zinc-100">
                  Notifications
                </h1>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {unreadCount} unread update{unreadCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{user.name}</p>
              <div className="flex items-center justify-end gap-1 text-[11px] text-zinc-500">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium">
                    <Shield className="size-3" /> Administrator
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Briefcase className="size-3" /> Field Employee
                  </span>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="gap-1.5 text-xs text-zinc-700 dark:text-zinc-300"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-white dark:bg-zinc-900 shadow-xs">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-lg">
            <button
              onClick={() => {
                setActiveTab('all');
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              All Notifications
            </button>
            <button
              onClick={() => {
                setActiveTab('unread');
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'unread'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isNotificationsFetching}
              className="gap-1.5 text-xs text-zinc-700 dark:text-zinc-300"
            >
              <RefreshCw
                className={`size-3.5 ${isNotificationsFetching ? 'animate-spin text-emerald-600' : ''}`}
              />
              Refresh
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <CheckCheck className="size-3.5" />
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List Card */}
        <Card>
          <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  {activeTab === 'all' ? 'All Activity Feed' : 'Unread Notifications'}
                </CardTitle>
                <CardDescription className="text-xs">
                  Showing {items.length} of {total} notifications
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-zinc-100 dark:divide-zinc-800">
            {isNotificationsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <RefreshCw className="size-6 animate-spin text-emerald-600" />
                <p className="text-xs text-zinc-500">Loading notifications...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="size-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                  <Inbox className="size-6 text-zinc-400" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {activeTab === 'unread' ? 'All caught up!' : 'No notifications yet'}
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  {activeTab === 'unread'
                    ? 'You have read all your notifications. Switch to "All Notifications" to view your history.'
                    : 'System alerts and activity updates regarding orders, expenses, and incentives will appear here.'}
                </p>
              </div>
            ) : (
              items.map((notification: Notification) => (
                <div
                  key={notification._id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 transition-colors ${
                    !notification.isRead
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/20'
                      : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="size-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getNotificationBadge(notification.type)}
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {notification.title}
                        </span>
                        {!notification.isRead && (
                          <span className="size-2 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 break-words leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-0.5">
                        <span className="flex items-center gap-1">
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
                        className="h-8 px-2.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400"
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
                      className="h-8 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
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
            <p className="text-xs text-zinc-500">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="gap-1 text-xs"
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
