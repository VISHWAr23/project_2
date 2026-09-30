// User instruction: "Phase 11: Notifications - Integrate notification bell and unread badge in dashboard header"
// Importers/callers: Next.js App Router (/dashboard), AuthProvider navigation
// Affected API: GET /api/dashboard/admin, GET /api/dashboard/employee, GET /api/notifications/unread-count
// Data schemas: AdminDashboardData, EmployeeDashboardData, QueryDashboardParams, UnreadCountResponse

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { dashboardApi } from '@/lib/api/dashboard';
import { notificationsApi } from '@/lib/api/notifications';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Users,
  Building,
  Calendar,
  ShoppingBag,
  IndianRupee,
  Receipt,
  Award,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  Shield,
  Briefcase,
  Plus,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  MapPin,
  Car,
  Plane,
  Utensils,
  Hotel,
  HelpCircle,
  Filter,
  Check,
  Ban,
  UserCheck,
  UserX,
  ExternalLink,
  BarChart3,
  Bell,
} from 'lucide-react';
import type { ExpenseType } from '@/types/expense.types';
import type { OrderStatus } from '@/types/order.types';
import type { QueryDashboardParams } from '@/types/dashboard.types';

type DatePreset = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

export default function DashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  // Date Filtering State
  const [datePreset, setDatePreset] = useState<DatePreset>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Active query parameters based on preset
  const queryParams: QueryDashboardParams = useMemo(() => {
    const now = new Date();
    const toISODate = (d: Date) => d.toISOString().split('T')[0];

    if (datePreset === 'TODAY') {
      const today = toISODate(now);
      return { startDate: today, endDate: today };
    }
    if (datePreset === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.getFullYear(), now.getMonth(), diff);
      return { startDate: toISODate(monday), endDate: toISODate(now) };
    }
    if (datePreset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: toISODate(firstDay), endDate: toISODate(now) };
    }
    if (datePreset === 'LAST_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: toISODate(firstDay), endDate: toISODate(lastDay) };
    }
    if (datePreset === 'CUSTOM') {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
      };
    }
    return {};
  }, [datePreset, customStartDate, customEndDate]);

  const isAdmin = user?.role === 'ADMIN';

  // 1. Fetch Admin Dashboard Data (Admin only)
  const {
    data: adminData,
    isLoading: adminLoading,
    isError: isAdminError,
    refetch: refetchAdmin,
    isFetching: adminFetching,
  } = useQuery({
    queryKey: ['dashboard', 'admin', queryParams],
    queryFn: () => dashboardApi.getAdminDashboard(queryParams),
    enabled: !!user && isAdmin,
  });

  // 2. Fetch Employee Dashboard Data (Employee & Admin preview)
  const {
    data: employeeData,
    isLoading: employeeLoading,
    isError: isEmployeeError,
    refetch: refetchEmployee,
    isFetching: employeeFetching,
  } = useQuery({
    queryKey: ['dashboard', 'employee', queryParams],
    queryFn: () => dashboardApi.getEmployeeDashboard(queryParams),
    enabled: !!user && !isAdmin,
  });

  // 3. Fetch Unread Notifications Count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Protect route
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || (!user && isAuthenticated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isLoading = isAdmin ? adminLoading : employeeLoading;
  const isError = isAdmin ? isAdminError : isEmployeeError;
  const isFetching = isAdmin ? adminFetching : employeeFetching;
  const handleRefresh = () => {
    if (isAdmin) refetchAdmin();
    else refetchEmployee();
  };

  const getExpenseTypeIcon = (type: ExpenseType) => {
    switch (type) {
      case 'FUEL':
        return <Car className="size-4 text-amber-600 dark:text-amber-400" />;
      case 'TRAVEL':
        return <Plane className="size-4 text-blue-600 dark:text-blue-400" />;
      case 'FOOD':
        return <Utensils className="size-4 text-emerald-600 dark:text-emerald-400" />;
      case 'ACCOMMODATION':
        return <Hotel className="size-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <HelpCircle className="size-4 text-zinc-500" />;
    }
  };

  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Check className="size-3" /> Approved
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <CheckCircle2 className="size-3" /> Completed
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <XCircle className="size-3" /> Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
            <Ban className="size-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock className="size-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold leading-none text-zinc-900 dark:text-zinc-100">
                  Lathikka
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {isAdmin ? 'Admin Console' : 'Field Operations'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">Marketing Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
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
              onClick={() => router.push('/reports')}
              className="gap-1.5 text-xs text-zinc-700 dark:text-zinc-300"
            >
              <BarChart3 className="size-3.5 text-emerald-600" />
              Reports
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/notifications')}
              className="relative gap-1.5 text-xs text-zinc-700 dark:text-zinc-300"
            >
              <Bell className="size-3.5 text-zinc-600 dark:text-zinc-400" />
              <span className="hidden sm:inline">Notifications</span>
              {unreadData && unreadData.count > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-rose-600 rounded-full">
                  {unreadData.count > 99 ? '99+' : unreadData.count}
                </span>
              )}
            </Button>

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

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Controls Bar: Welcome Banner & Date Range Selector */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-xl border bg-white dark:bg-zinc-900 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Welcome, {user.name}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isAdmin
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                }`}
              >
                {isAdmin ? 'System Admin' : 'Employee'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {isAdmin
                ? 'High-level real-time operational overview, approval queues, and staff performance metrics.'
                : 'Your personal activity tracking, assigned accounts, sales orders, and reimbursement claims.'}
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg text-xs font-medium">
              <Filter className="size-3.5 text-zinc-500 ml-1.5 mr-0.5" />
              {(['THIS_MONTH', 'THIS_WEEK', 'TODAY', 'LAST_MONTH', 'ALL', 'CUSTOM'] as DatePreset[]).map(
                (preset) => (
                  <button
                    key={preset}
                    onClick={() => setDatePreset(preset)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      datePreset === preset
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {preset === 'THIS_MONTH'
                      ? 'This Month'
                      : preset === 'THIS_WEEK'
                      ? 'This Week'
                      : preset === 'TODAY'
                      ? 'Today'
                      : preset === 'LAST_MONTH'
                      ? 'Last Month'
                      : preset === 'ALL'
                      ? 'All Time'
                      : 'Custom'}
                  </button>
                ),
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="gap-1.5 h-8 text-xs"
              title="Refresh dashboard metrics"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {datePreset === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-zinc-900 border rounded-xl shadow-xs text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-medium">Start Date:</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-medium">End Date:</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="h-8 text-xs text-zinc-500"
              >
                Clear Custom Dates
              </Button>
            )}
            <p className="text-[11px] text-zinc-400 ml-auto italic">
              Dates applied to Visits (visitDate), Orders (orderDate), Expenses (date), Incentives (createdAt)
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-zinc-900 rounded-xl border border-dashed text-center space-y-3">
            <RefreshCw className="size-8 animate-spin text-emerald-600" />
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">Loading dashboard...</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Aggregating real-time database metrics for the selected period
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center p-12 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl text-center space-y-3">
            <AlertCircle className="size-8 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-semibold text-rose-900 dark:text-rose-200">Unable to load dashboard.</p>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                There was a problem retrieving the aggregated analytics data from the server.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2 text-rose-700 dark:text-rose-300 border-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40"
            >
              <RefreshCw className="size-3.5" /> Try Again
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADMIN DASHBOARD VIEW */}
        {/* ========================================================================= */}
        {isAdmin && adminData && !isLoading && (
          <div className="space-y-6">
            {/* 1. Pending Approvals Banner (Actionable Alert Cards) */}
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Pending Approvals Requiring Action
                  </h3>
                </div>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  {adminData.pendingApprovals.pendingOrdersCount +
                    adminData.pendingApprovals.pendingExpensesCount}{' '}
                  Total Tasks Pending
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pending Orders Action Card */}
                <div
                  onClick={() => router.push('/orders')}
                  className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 rounded-lg hover:border-amber-400 dark:hover:border-amber-700 transition cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                      <ShoppingBag className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Pending Sales Orders
                      </p>
                      <p className="text-xs text-zinc-500">
                        {adminData.pendingApprovals.pendingOrdersCount} orders (
                        {formatCurrency(adminData.pendingApprovals.pendingOrdersAmount)})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                    Review <ArrowRight className="size-3.5" />
                  </div>
                </div>

                {/* Pending Expenses Action Card */}
                <div
                  onClick={() => router.push('/expenses')}
                  className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 rounded-lg hover:border-amber-400 dark:hover:border-amber-700 transition cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                      <Receipt className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Pending Expense Claims
                      </p>
                      <p className="text-xs text-zinc-500">
                        {adminData.pendingApprovals.pendingExpensesCount} claims (
                        {formatCurrency(adminData.pendingApprovals.pendingExpensesAmount)})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                    Review <ArrowRight className="size-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Primary KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Total Employees */}
              <Card
                onClick={() => router.push('/employees')}
                className="cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition shadow-2xs"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">Employees</CardTitle>
                  <Users className="size-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatNumber(adminData.summary.totalEmployees)}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Active team members</p>
                </CardContent>
              </Card>

              {/* Total Customers */}
              <Card
                onClick={() => router.push('/customers')}
                className="cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition shadow-2xs"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">Customers</CardTitle>
                  <Building className="size-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatNumber(adminData.summary.totalCustomers)}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {adminData.customers.activeCustomers} active ·{' '}
                    {adminData.customers.inactiveCustomers} inactive
                  </p>
                </CardContent>
              </Card>

              {/* Total Visits */}
              <Card
                onClick={() => router.push('/visits')}
                className="cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition shadow-2xs"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">Visits</CardTitle>
                  <Calendar className="size-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatNumber(adminData.summary.totalVisits)}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Recorded field interactions</p>
                </CardContent>
              </Card>

              {/* Orders & Total Value */}
              <Card
                onClick={() => router.push('/orders')}
                className="cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition shadow-2xs"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">Total Order Value</CardTitle>
                  <IndianRupee className="size-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(adminData.summary.totalOrderValue)}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {formatNumber(adminData.summary.totalOrders)} orders (
                    {formatCurrency(adminData.orders.approvedOrderValue)} approved)
                  </p>
                </CardContent>
              </Card>

              {/* Total Expenses */}
              <Card
                onClick={() => router.push('/expenses')}
                className="cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition shadow-2xs"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">Total Expenses</CardTitle>
                  <Receipt className="size-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(adminData.summary.totalExpenses)}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {formatCurrency(adminData.summary.totalApprovedExpenseAmount)} approved ·{' '}
                    {formatCurrency(adminData.summary.totalPendingExpenseAmount)} pending
                  </p>
                </CardContent>
              </Card>

              {/* Total Incentives */}
              <Card
                onClick={() => router.push('/incentives')}
                className="cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition shadow-2xs"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">Incentives</CardTitle>
                  <Award className="size-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(adminData.summary.totalIncentives)}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {formatCurrency(adminData.summary.totalPaidIncentives)} paid ·{' '}
                    {formatCurrency(adminData.summary.totalUnpaidIncentives)} unpaid
                  </p>
                </CardContent>
              </Card>

              {/* Order Status Overview Card */}
              <Card className="shadow-2xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">Orders Status</CardTitle>
                  <ShoppingBag className="size-4 text-zinc-400" />
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600 font-medium">Approved:</span>
                    <span className="font-bold">{adminData.orders.approvedOrders}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-600 font-medium">Completed:</span>
                    <span className="font-bold">{adminData.orders.completedOrders}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-600 font-medium">Pending:</span>
                    <span className="font-bold">{adminData.orders.pendingOrders}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Operational Shortcuts Card */}
              <Card className="shadow-2xs bg-zinc-50/50 dark:bg-zinc-900/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">Quick Modules</CardTitle>
                  <Briefcase className="size-4 text-zinc-400" />
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-1 text-[11px]">
                  <button
                    onClick={() => router.push('/employees')}
                    className="p-1 text-left font-medium text-zinc-700 dark:text-zinc-300 hover:text-emerald-600"
                  >
                    → Employees
                  </button>
                  <button
                    onClick={() => router.push('/customers')}
                    className="p-1 text-left font-medium text-zinc-700 dark:text-zinc-300 hover:text-emerald-600"
                  >
                    → Customers
                  </button>
                  <button
                    onClick={() => router.push('/orders')}
                    className="p-1 text-left font-medium text-zinc-700 dark:text-zinc-300 hover:text-emerald-600"
                  >
                    → Orders
                  </button>
                  <button
                    onClick={() => router.push('/expenses')}
                    className="p-1 text-left font-medium text-zinc-700 dark:text-zinc-300 hover:text-emerald-600"
                  >
                    → Expenses
                  </button>
                  <button
                    onClick={() => router.push('/reports')}
                    className="p-1 text-left font-medium text-zinc-700 dark:text-zinc-300 hover:text-emerald-600"
                  >
                    → Reports
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* 3. Employee Performance Aggregation Table */}
            <Card className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="size-4 text-emerald-600" />
                    Employee Performance
                  </CardTitle>
                  <CardDescription>
                    Aggregated metrics per active field staff for the selected date range
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/employees')}
                  className="text-xs gap-1"
                >
                  View All Employees <ArrowRight className="size-3" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-y border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Employee</th>
                        <th className="py-2.5 px-3 text-center">Assigned Customers</th>
                        <th className="py-2.5 px-3 text-center">Visits</th>
                        <th className="py-2.5 px-3 text-center">Orders</th>
                        <th className="py-2.5 px-3 text-right">Order Value</th>
                        <th className="py-2.5 px-3 text-right">Approved Incentives</th>
                        <th className="py-2.5 px-3 text-right">Expenses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {adminData.employeePerformance.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-zinc-500">
                            No active employees found.
                          </td>
                        </tr>
                      ) : (
                        adminData.employeePerformance.map((emp) => (
                          <tr
                            key={emp.employeeId}
                            onClick={() => router.push(`/employees/${emp.employeeId}`)}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition"
                          >
                            <td className="py-3 px-4">
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {emp.employeeName}
                              </p>
                              <p className="text-[11px] text-zinc-400">{emp.employeeEmail}</p>
                            </td>
                            <td className="py-3 px-3 text-center font-medium text-zinc-700 dark:text-zinc-300">
                              {emp.assignedCustomers}
                            </td>
                            <td className="py-3 px-3 text-center font-medium text-zinc-700 dark:text-zinc-300">
                              {emp.visits}
                            </td>
                            <td className="py-3 px-3 text-center font-medium text-zinc-700 dark:text-zinc-300">
                              {emp.orders}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(emp.orderValue)}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                              {formatCurrency(emp.approvedIncentives)}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                              {formatCurrency(emp.totalExpenses)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 4. Sales Orders & Expenses Breakdown (Two Column Layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales & Orders Breakdown Card */}
              <Card className="shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShoppingBag className="size-4 text-blue-600" />
                    Sales & Orders Breakdown
                  </CardTitle>
                  <CardDescription>Order progression and volume distribution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border text-center">
                      <p className="text-[11px] text-zinc-500 uppercase font-semibold">Total Orders</p>
                      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                        {adminData.orders.totalOrders}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900 text-center">
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 uppercase font-semibold">
                        Approved
                      </p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                        {adminData.orders.approvedOrders}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900 text-center">
                      <p className="text-[11px] text-blue-700 dark:text-blue-300 uppercase font-semibold">
                        Completed
                      </p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                        {adminData.orders.completedOrders}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900 text-center">
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 uppercase font-semibold">
                        Pending
                      </p>
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                        {adminData.orders.pendingOrders}
                      </p>
                    </div>
                    <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900 text-center">
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 uppercase font-semibold">
                        Rejected
                      </p>
                      <p className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-0.5">
                        {adminData.orders.rejectedOrders}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border text-center">
                      <p className="text-[11px] text-zinc-500 uppercase font-semibold">Cancelled</p>
                      <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mt-0.5">
                        {adminData.orders.cancelledOrders}
                      </p>
                    </div>
                  </div>

                  {/* Date-wise order trend snippet */}
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Recent Date-wise Sales
                    </p>
                    {adminData.orders.dateWiseOrderValue.length === 0 ? (
                      <p className="text-xs text-zinc-400 py-2 text-center">
                        No order records found for this date range.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {adminData.orders.dateWiseOrderValue.slice(-5).map((d) => (
                          <div
                            key={d.date}
                            className="flex items-center justify-between text-xs p-2 rounded-md bg-zinc-50 dark:bg-zinc-800/40"
                          >
                            <span className="font-medium text-zinc-600 dark:text-zinc-400">
                              {formatDate(d.date)}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-zinc-500">{d.count} orders</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(d.totalAmount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Expenses Breakdown by Category Card */}
              <Card className="shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Receipt className="size-4 text-emerald-600" />
                    Expense Category Breakdown
                  </CardTitle>
                  <CardDescription>
                    Total expenditure categorized by reimbursement type
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border text-center">
                      <p className="text-[11px] text-zinc-500 uppercase font-semibold">Total Claims</p>
                      <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                        {adminData.expenses.totalExpenses}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900 text-center">
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 uppercase font-semibold">
                        Approved
                      </p>
                      <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                        {formatCurrency(adminData.expenses.approvedAmount)}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900 text-center">
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 uppercase font-semibold">
                        Pending
                      </p>
                      <p className="text-base font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                        {formatCurrency(adminData.expenses.pendingAmount)}
                      </p>
                    </div>
                  </div>

                  {/* By Type Table */}
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Breakdown by Type
                    </p>
                    {adminData.expenses.byType.length === 0 ? (
                      <p className="text-xs text-zinc-400 py-2 text-center">
                        No expense records in this period.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {adminData.expenses.byType.map((item) => (
                          <div
                            key={item.type}
                            className="flex items-center justify-between p-2 rounded-md bg-zinc-50 dark:bg-zinc-800/40 text-xs"
                          >
                            <div className="flex items-center gap-2 font-medium">
                              {getExpenseTypeIcon(item.type)}
                              <span>{item.type}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-zinc-500">{item.count} items</span>
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                {formatCurrency(item.totalAmount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 5. Recent Field Visits Section */}
            <Card className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <MapPin className="size-4 text-emerald-600" />
                    Recent Field Visits
                  </CardTitle>
                  <CardDescription>Latest customer interactions logged by the team</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/visits')}
                  className="text-xs gap-1"
                >
                  View All Visits <ArrowRight className="size-3" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-y border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Customer</th>
                        <th className="py-2.5 px-3">Employee</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Purpose</th>
                        <th className="py-2.5 px-3">Outcome / Result</th>
                        <th className="py-2.5 px-3">Follow-up</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {adminData.visits.recentVisits.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-zinc-500">
                            No visits recorded in this period.
                          </td>
                        </tr>
                      ) : (
                        adminData.visits.recentVisits.map((v) => (
                          <tr key={v.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                              {v.customerName}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                              {v.employeeName}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                              {formatDate(v.visitDate)}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                              {v.result || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                              {v.result || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-500">
                              {v.followUpDate ? formatDate(v.followUpDate) : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* EMPLOYEE DASHBOARD VIEW */}
        {/* ========================================================================= */}
        {!isAdmin && employeeData && !isLoading && (
          <div className="space-y-6">
            {/* 1. Quick Action Launcher for Field Representatives */}
            <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 shadow-xs space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Quick Operations
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <Button
                  onClick={() => router.push('/customers')}
                  variant="outline"
                  className="h-10 text-xs justify-start gap-2 border-dashed hover:border-emerald-500"
                >
                  <Building className="size-4 text-emerald-600" />
                  <span>My Customers</span>
                </Button>
                <Button
                  onClick={() => router.push('/visits')}
                  variant="outline"
                  className="h-10 text-xs justify-start gap-2 border-dashed hover:border-emerald-500"
                >
                  <MapPin className="size-4 text-blue-600" />
                  <span>Log Visit</span>
                </Button>
                <Button
                  onClick={() => router.push('/orders')}
                  variant="outline"
                  className="h-10 text-xs justify-start gap-2 border-dashed hover:border-emerald-500"
                >
                  <ShoppingBag className="size-4 text-purple-600" />
                  <span>Create Order</span>
                </Button>
                <Button
                  onClick={() => router.push('/expenses')}
                  variant="outline"
                  className="h-10 text-xs justify-start gap-2 border-dashed hover:border-emerald-500"
                >
                  <Receipt className="size-4 text-amber-600" />
                  <span>Claim Expense</span>
                </Button>
                <Button
                  onClick={() => router.push('/reports')}
                  variant="outline"
                  className="h-10 text-xs justify-start gap-2 border-dashed hover:border-emerald-500"
                >
                  <BarChart3 className="size-4 text-indigo-600" />
                  <span>My Reports</span>
                </Button>
              </div>
            </div>

            {/* 2. Personal Performance Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Assigned Customers */}
              <Card
                onClick={() => router.push('/customers')}
                className="cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition shadow-2xs"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">
                    Assigned Customers
                  </CardTitle>
                  <Building className="size-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatNumber(employeeData.summary.assignedCustomers)}
                  </div>
                </CardContent>
              </Card>

              {/* Total Field Visits */}
              <Card
                onClick={() => router.push('/visits')}
                className="cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition shadow-2xs"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">My Visits</CardTitle>
                  <Calendar className="size-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatNumber(employeeData.summary.totalVisits)}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Field visits completed</p>
                </CardContent>
              </Card>

              {/* Sales Orders & Value */}
              <Card
                onClick={() => router.push('/orders')}
                className="cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition shadow-2xs"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">My Sales Value</CardTitle>
                  <IndianRupee className="size-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(employeeData.summary.totalOrderValue)}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {employeeData.summary.totalOrders} total orders booked
                  </p>
                </CardContent>
              </Card>

              {/* Personal Expense Claims */}
              <Card
                onClick={() => router.push('/expenses')}
                className="cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition shadow-2xs"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">Expense Claims</CardTitle>
                  <Receipt className="size-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(employeeData.expenses.totalAmount)}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {formatCurrency(employeeData.summary.approvedExpensesAmount)} approved ·{' '}
                    {formatCurrency(employeeData.summary.pendingExpensesAmount)} pending
                  </p>
                </CardContent>
              </Card>

              {/* Personal Incentives */}
              <Card
                onClick={() => router.push('/incentives')}
                className="cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition shadow-2xs"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">
                    Earned Incentives
                  </CardTitle>
                  <Award className="size-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(employeeData.incentives.totalAmount)}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {formatCurrency(employeeData.summary.paidIncentivesAmount)} paid ·{' '}
                    {formatCurrency(employeeData.summary.pendingIncentivesAmount)} unpaid
                  </p>
                </CardContent>
              </Card>

              {/* Order Status Tally */}
              <Card className="shadow-2xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">
                    Order Status Tally
                  </CardTitle>
                  <ShoppingBag className="size-4 text-zinc-400" />
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600 font-medium">Approved:</span>
                    <span className="font-bold">{employeeData.orders.approved}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-600 font-medium">Completed:</span>
                    <span className="font-bold">{employeeData.orders.completed}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-600 font-medium">Pending:</span>
                    <span className="font-bold">{employeeData.orders.pending}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 3. Recent Activity: Recent Orders & Recent Visits */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders Card */}
              <Card className="shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <ShoppingBag className="size-4 text-blue-600" />
                      My Recent Orders
                    </CardTitle>
                    <CardDescription>Latest orders booked under your accounts</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/orders')}
                    className="text-xs gap-1"
                  >
                    View All <ArrowRight className="size-3" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-y border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Customer</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {employeeData.orders.recent.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-zinc-500">
                              No orders logged in this period.
                            </td>
                          </tr>
                        ) : (
                          employeeData.orders.recent.map((o) => (
                            <tr
                              key={o.id}
                              onClick={() => router.push(`/orders/${o.id}`)}
                              className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition"
                            >
                              <td className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                                {o.customerName}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                                {formatDate(o.orderDate)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(o.totalAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-center">{getOrderStatusBadge(o.status)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Visits Card */}
              <Card className="shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <MapPin className="size-4 text-emerald-600" />
                      My Recent Field Visits
                    </CardTitle>
                    <CardDescription>Latest customer visits you recorded</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/visits')}
                    className="text-xs gap-1"
                  >
                    View All <ArrowRight className="size-3" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-y border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Customer</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Purpose</th>
                          <th className="py-2.5 px-3">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {employeeData.visits.recent.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-zinc-500">
                              No visits recorded in this period.
                            </td>
                          </tr>
                        ) : (
                          employeeData.visits.recent.map((v) => (
                            <tr key={v.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                              <td className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                                {v.customerName}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                                {formatDate(v.visitDate)}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                                {v.purpose || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                                {v.result || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 4. Personal Expenses by Category */}
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Receipt className="size-4 text-amber-600" />
                  My Expense Claims Breakdown
                </CardTitle>
                <CardDescription>
                  Breakdown of reimbursement claims submitted across categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {employeeData.expenses.byType.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">
                    No expense claims recorded for this period.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {employeeData.expenses.byType.map((item) => (
                      <div
                        key={item.type}
                        className="flex items-center justify-between p-3 rounded-lg border bg-zinc-50/50 dark:bg-zinc-800/30 text-xs"
                      >
                        <div className="flex items-center gap-2 font-medium">
                          {getExpenseTypeIcon(item.type)}
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.type}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(item.totalAmount)}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {item.count} claims
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}