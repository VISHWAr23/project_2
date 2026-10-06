// User instruction: "8. Dashboard (/dashboard): Admin view (KPI cards, Revenue chart, Quick actions, Recent orders table, Recent visits list, Top performers leaderboard), Employee view (My target vs actual progress bar, Today's scheduled visits, Recent orders logged, Commission earned summary)."
// Importers/callers: Next.js App Router (/dashboard), AppShell
// Affected API: GET /api/dashboard/admin, GET /api/dashboard/employee, GET /api/notifications/unread-count
// Data schemas: AdminDashboardData, EmployeeDashboardData, QueryDashboardParams, UnreadCountResponse

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { dashboardApi } from '@/lib/api/dashboard';
import { formatDate, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Users,
  Building,
  ShoppingBag,
  Receipt,
  Award,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  MapPin,
  Car,
  Plane,
  Utensils,
  Hotel,
  HelpCircle,
  Briefcase,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import type { ExpenseType } from '@/types/expense.types';
import type { QueryDashboardParams } from '@/types/dashboard.types';
import { cn } from '@/lib/utils';

type DatePreset = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

export default function DashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
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

  // Protect route
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || (!user && isAuthenticated)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-6 animate-spin text-primary" />
          <p className="text-xs font-medium text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

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
        return <Car className="size-4 text-amber-400" />;
      case 'TRAVEL':
        return <Plane className="size-4 text-blue-400" />;
      case 'FOOD':
        return <Utensils className="size-4 text-emerald-400" />;
      case 'ACCOMMODATION':
        return <Hotel className="size-4 text-purple-400" />;
      default:
        return <HelpCircle className="size-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Executive Overview"
        subtitle={
          isAdmin
            ? 'High-level real-time operational metrics, pending approval queues, and staff performance.'
            : 'Your personal sales target tracking, logged customer visits, and reimbursement claims.'
        }
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
            {isAdmin ? <Shield className="size-3" /> : <Briefcase className="size-3" />}
            {isAdmin ? 'System Administrator' : 'Field Representative'}
          </span>
        }
      >
        {/* Date Presets Filter Bar */}
        <div className="flex items-center gap-1 p-1 bg-card rounded-lg border border-border overflow-x-auto max-w-full custom-scrollbar">
          {(['THIS_MONTH', 'THIS_WEEK', 'TODAY', 'LAST_MONTH', 'ALL', 'CUSTOM'] as DatePreset[]).map(
            (preset) => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-all',
                  datePreset === preset
                    ? 'bg-primary/15 text-primary font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
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
            )
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="gap-1.5 text-xs text-foreground hover:bg-muted"
          title="Refresh metrics"
        >
          <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin text-primary')} />
          <span>Refresh</span>
        </Button>
      </PageHeader>

      {/* Custom Date Range Inputs */}
      {datePreset === 'CUSTOM' && (
        <div className="flex flex-wrap items-center gap-3 p-3.5 bg-card border border-border rounded-xl text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">Start Date:</span>
            <Input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="h-8 text-xs w-36 bg-background border-border"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">End Date:</span>
            <Input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="h-8 text-xs w-36 bg-background border-border"
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
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto italic">
            Applies to Visits, Orders, Expenses, & Incentives
          </span>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-16 bg-card rounded-xl border border-border text-center space-y-3">
          <RefreshCw className="size-8 animate-spin text-primary" />
          <div>
            <p className="font-semibold text-foreground">Loading dashboard analytics...</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aggregating real-time records for the selected timeframe
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <EmptyState
          icon={AlertCircle}
          title="Unable to load dashboard"
          description="There was an error communicating with the analytics server. Please check your connection and try again."
          action={{
            label: 'Retry Loading',
            onClick: handleRefresh,
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* ADMIN DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {isAdmin && adminData && !isLoading && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 1. Pending Approvals Callout Banner */}
          {(adminData.pendingApprovals.pendingOrdersCount > 0 ||
            adminData.pendingApprovals.pendingExpensesCount > 0) && (
            <div className="p-4 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-md bg-primary/20 flex items-center justify-center text-primary">
                    <AlertCircle className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground font-heading">
                    Action Required: Pending Approvals
                  </h3>
                </div>
                <span className="text-xs font-semibold text-primary">
                  {adminData.pendingApprovals.pendingOrdersCount +
                    adminData.pendingApprovals.pendingExpensesCount}{' '}
                  items awaiting review
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pending Orders Card */}
                <Link
                  href="/orders"
                  className="flex items-center justify-between p-3.5 bg-card/80 backdrop-blur-sm border border-border/80 rounded-xl hover:border-primary/40 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <ShoppingBag className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Pending Sales Orders</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {adminData.pendingApprovals.pendingOrdersCount} orders (
                        <CurrencyDisplay
                          amount={adminData.pendingApprovals.pendingOrdersAmount}
                          className="font-semibold text-foreground"
                        />
                        )
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                    <span>Review</span>
                    <ArrowRight className="size-3.5" />
                  </div>
                </Link>

                {/* Pending Expenses Card */}
                <Link
                  href="/expenses"
                  className="flex items-center justify-between p-3.5 bg-card/80 backdrop-blur-sm border border-border/80 rounded-xl hover:border-primary/40 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Receipt className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Pending Expense Claims</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {adminData.pendingApprovals.pendingExpensesCount} claims (
                        <CurrencyDisplay
                          amount={adminData.pendingApprovals.pendingExpensesAmount}
                          className="font-semibold text-foreground"
                        />
                        )
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                    <span>Review</span>
                    <ArrowRight className="size-3.5" />
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* 2. Primary KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue / Orders"
              value={<CurrencyDisplay amount={adminData.summary.totalOrderValue} />}
              description={`${formatNumber(adminData.summary.totalOrders)} orders logged`}
              icon={ShoppingBag}
              variant="gold"
              onClick={() => router.push('/orders')}
            />

            <StatCard
              title="Customer Network"
              value={formatNumber(adminData.summary.totalCustomers)}
              description={`${adminData.customers.activeCustomers} active · ${adminData.customers.inactiveCustomers} inactive`}
              icon={Building}
              variant="default"
              onClick={() => router.push('/customers')}
            />

            <StatCard
              title="Field Visits Completed"
              value={formatNumber(adminData.summary.totalVisits)}
              description="Logged client touchpoints"
              icon={MapPin}
              variant="emerald"
              onClick={() => router.push('/visits')}
            />

            <StatCard
              title="Team Size"
              value={formatNumber(adminData.summary.totalEmployees)}
              description="Active sales representatives"
              icon={Users}
              variant="blue"
              onClick={() => router.push('/employees')}
            />
          </div>

          {/* Secondary Financial KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Expense Claims"
              value={<CurrencyDisplay amount={adminData.summary.totalExpenses} />}
              description={`Approved: ${formatNumber(adminData.expenses.approvedAmount)} · Pending: ${formatNumber(adminData.expenses.pendingAmount)}`}
              icon={Receipt}
              variant="rose"
              onClick={() => router.push('/expenses')}
            />

            <StatCard
              title="Commissions & Incentives"
              value={<CurrencyDisplay amount={adminData.summary.totalIncentives} />}
              description={`Paid: ${formatNumber(adminData.summary.totalPaidIncentives)} · Pending: ${formatNumber(adminData.summary.totalUnpaidIncentives)}`}
              icon={Award}
              variant="amber"
              onClick={() => router.push('/incentives')}
            />

            <div className="p-5 rounded-xl bg-card border border-border flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Order Status Pipeline
                </span>
                <Layers className="size-4 text-primary" />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 text-center">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[10px] font-semibold text-emerald-400 uppercase">Approved</p>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">
                    {adminData.orders.approvedOrders}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-[10px] font-semibold text-blue-400 uppercase">Completed</p>
                  <p className="text-base font-bold text-blue-400 mt-0.5">
                    {adminData.orders.completedOrders}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] font-semibold text-amber-400 uppercase">Pending</p>
                  <p className="text-base font-bold text-amber-400 mt-0.5">
                    {adminData.orders.pendingOrders}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Employee Performance Leaderboard Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  <h3 className="text-base font-bold text-foreground font-heading">
                    Field Team Performance Leaderboard
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Individual productivity, sales contribution, and operational expenses
                </p>
              </div>
              <Link href="/employees">
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <span>Manage Team</span>
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Representative</th>
                    <th className="py-3 px-3 text-center">Assigned Customers</th>
                    <th className="py-3 px-3 text-center">Visits</th>
                    <th className="py-3 px-3 text-center">Orders</th>
                    <th className="py-3 px-3 text-right">Total Order Value</th>
                    <th className="py-3 px-3 text-right">Incentives</th>
                    <th className="py-3 px-4 text-right">Expenses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {adminData.employeePerformance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No employee activity records found for this period.
                      </td>
                    </tr>
                  ) : (
                    adminData.employeePerformance.map((emp, idx) => (
                      <tr
                        key={emp.employeeId}
                        onClick={() => router.push(`/employees/${emp.employeeId}`)}
                        className="hover:bg-muted/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="size-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {emp.employeeName}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{emp.employeeEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-foreground">
                          {emp.assignedCustomers}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-foreground">
                          {emp.visits}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-foreground">
                          {emp.orders}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">
                          <CurrencyDisplay amount={emp.orderValue} />
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-foreground">
                          <CurrencyDisplay amount={emp.approvedIncentives} />
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-muted-foreground">
                          <CurrencyDisplay amount={emp.totalExpenses} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Sales Orders Progression & Expense Breakdown (2-column layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Order Progression */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="size-4 text-primary" />
                  <h4 className="text-sm font-bold text-foreground font-heading">
                    Sales Pipeline Breakdown
                  </h4>
                </div>
                <Link href="/orders" className="text-xs text-primary hover:underline">
                  View Orders
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="p-3 bg-muted/40 rounded-lg border border-border/60 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Total Logged
                  </p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {adminData.orders.totalOrders}
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
                  <p className="text-[10px] text-emerald-400 uppercase font-semibold">Approved</p>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">
                    {adminData.orders.approvedOrders}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-center">
                  <p className="text-[10px] text-blue-400 uppercase font-semibold">Completed</p>
                  <p className="text-lg font-bold text-blue-400 mt-0.5">
                    {adminData.orders.completedOrders}
                  </p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-center">
                  <p className="text-[10px] text-amber-400 uppercase font-semibold">Pending</p>
                  <p className="text-lg font-bold text-amber-400 mt-0.5">
                    {adminData.orders.pendingOrders}
                  </p>
                </div>
                <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20 text-center">
                  <p className="text-[10px] text-rose-400 uppercase font-semibold">Rejected</p>
                  <p className="text-lg font-bold text-rose-400 mt-0.5">
                    {adminData.orders.rejectedOrders}
                  </p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border border-border/60 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Cancelled</p>
                  <p className="text-lg font-bold text-muted-foreground mt-0.5">
                    {adminData.orders.cancelledOrders}
                  </p>
                </div>
              </div>

              {/* Date-wise sales preview */}
              <div className="pt-3 border-t border-border/60 space-y-2">
                <span className="text-xs font-semibold text-foreground">Recent Daily Sales</span>
                {adminData.orders.dateWiseOrderValue.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No order volume recorded in this timeframe.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {adminData.orders.dateWiseOrderValue.slice(-5).map((d) => (
                      <div
                        key={d.date}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40"
                      >
                        <span className="font-medium text-muted-foreground">{formatDate(d.date)}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{d.count} orders</span>
                          <CurrencyDisplay
                            amount={d.totalAmount}
                            className="font-bold text-emerald-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Expense Category Breakdown */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Receipt className="size-4 text-primary" />
                  <h4 className="text-sm font-bold text-foreground font-heading">
                    Expense Category Allocation
                  </h4>
                </div>
                <Link href="/expenses" className="text-xs text-primary hover:underline">
                  View Claims
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-muted/40 rounded-lg border border-border/60 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Claims</p>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    {adminData.expenses.totalExpenses}
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
                  <p className="text-[10px] text-emerald-400 uppercase font-semibold">Approved</p>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">
                    <CurrencyDisplay amount={adminData.expenses.approvedAmount} />
                  </p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-center">
                  <p className="text-[10px] text-amber-400 uppercase font-semibold">Pending</p>
                  <p className="text-base font-bold text-amber-400 mt-0.5">
                    <CurrencyDisplay amount={adminData.expenses.pendingAmount} />
                  </p>
                </div>
              </div>

              {/* Breakdown by Type */}
              <div className="pt-3 border-t border-border/60 space-y-2">
                <span className="text-xs font-semibold text-foreground">Categories</span>
                {adminData.expenses.byType.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No expense claims recorded.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {adminData.expenses.byType.map((item) => (
                      <div
                        key={item.type}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs"
                      >
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          {getExpenseTypeIcon(item.type)}
                          <span>{item.type}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{item.count} claims</span>
                          <CurrencyDisplay
                            amount={item.totalAmount}
                            className="font-bold text-foreground"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Recent Field Visits Feed */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-border/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <h3 className="text-base font-bold text-foreground font-heading">
                    Recent Field Engagements
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Latest customer visits logged across all sales territories
                </p>
              </div>
              <Link href="/visits">
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <span>View All Visits</span>
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-3">Representative</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Purpose</th>
                    <th className="py-3 px-3">Outcome</th>
                    <th className="py-3 px-4">Follow-up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {adminData.visits.recentVisits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No visits recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    adminData.visits.recentVisits.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {v.customerName}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{v.employeeName}</td>
                        <td className="py-3 px-3 text-muted-foreground">{formatDate(v.visitDate)}</td>
                        <td className="py-3 px-3 text-foreground">{v.purpose || '-'}</td>
                        <td className="py-3 px-3 text-foreground">{v.result || '-'}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {v.followUpDate ? formatDate(v.followUpDate) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EMPLOYEE / FIELD STAFF VIEW */}
      {/* ========================================================================= */}
      {!isAdmin && employeeData && !isLoading && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Operations Strip */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Field Actions
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link href="/visits" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-11 text-xs justify-start gap-2.5 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                >
                  <MapPin className="size-4 text-primary" />
                  <span className="font-semibold text-foreground">Log Field Visit</span>
                </Button>
              </Link>
              <Link href="/orders" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-11 text-xs justify-start gap-2.5 hover:bg-muted"
                >
                  <ShoppingBag className="size-4 text-blue-400" />
                  <span className="font-semibold text-foreground">Create Sales Order</span>
                </Button>
              </Link>
              <Link href="/expenses" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-11 text-xs justify-start gap-2.5 hover:bg-muted"
                >
                  <Receipt className="size-4 text-amber-400" />
                  <span className="font-semibold text-foreground">Submit Expense Claim</span>
                </Button>
              </Link>
              <Link href="/customers" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-11 text-xs justify-start gap-2.5 hover:bg-muted"
                >
                  <Building className="size-4 text-emerald-400" />
                  <span className="font-semibold text-foreground">My Customers</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Personal Performance Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="My Sales Revenue"
              value={<CurrencyDisplay amount={employeeData.summary.totalOrderValue} />}
              description={`${employeeData.summary.totalOrders} total orders booked`}
              icon={ShoppingBag}
              variant="gold"
              onClick={() => router.push('/orders')}
            />

            <StatCard
              title="Field Visits Completed"
              value={formatNumber(employeeData.summary.totalVisits)}
              description="Customer visits logged"
              icon={MapPin}
              variant="emerald"
              onClick={() => router.push('/visits')}
            />

            <StatCard
              title="Assigned Accounts"
              value={formatNumber(employeeData.summary.assignedCustomers)}
              description="Active client portfolio"
              icon={Building}
              variant="blue"
              onClick={() => router.push('/customers')}
            />

            <StatCard
              title="Earned Incentives"
              value={<CurrencyDisplay amount={employeeData.incentives.totalAmount} />}
              description={`Paid: ${formatNumber(employeeData.summary.paidIncentivesAmount)} · Pending: ${formatNumber(employeeData.summary.pendingIncentivesAmount)}`}
              icon={Award}
              variant="amber"
              onClick={() => router.push('/incentives')}
            />
          </div>

          {/* Activity Tables: Recent Orders & Recent Visits */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-border/60">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="size-4 text-primary" />
                  <h4 className="text-sm font-bold text-foreground font-heading">
                    My Recent Orders
                  </h4>
                </div>
                <Link href="/orders">
                  <Button variant="ghost" size="sm" className="text-xs text-primary gap-1">
                    <span>View All</span>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {employeeData.orders.recent.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-muted-foreground">
                          No orders logged yet.
                        </td>
                      </tr>
                    ) : (
                      employeeData.orders.recent.map((o) => (
                        <tr
                          key={o.id}
                          onClick={() => router.push(`/orders/${o.id}`)}
                          className="hover:bg-muted/40 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-4 font-semibold text-foreground">
                            {o.customerName}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">{formatDate(o.orderDate)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            <CurrencyDisplay amount={o.totalAmount} />
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <StatusBadge status={o.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Visits */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-border/60">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <h4 className="text-sm font-bold text-foreground font-heading">
                    My Recent Field Visits
                  </h4>
                </div>
                <Link href="/visits">
                  <Button variant="ghost" size="sm" className="text-xs text-primary gap-1">
                    <span>View All</span>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Purpose</th>
                      <th className="py-2.5 px-4">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {employeeData.visits.recent.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-muted-foreground">
                          No visits logged yet.
                        </td>
                      </tr>
                    ) : (
                      employeeData.visits.recent.map((v) => (
                        <tr key={v.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-foreground">
                            {v.customerName}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">{formatDate(v.visitDate)}</td>
                          <td className="py-2.5 px-3 text-foreground">{v.purpose || '-'}</td>
                          <td className="py-2.5 px-4 text-foreground">{v.result || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
