// User instruction: "Phase 10: Reports - Create the frontend Reports page with tabs for all 7 reporting dimensions, reusable filters, and Indian currency/date formatting"
// Importers/callers: Next.js App Router (/reports), AppShell navigation link
// Affected API: /api/reports/visits/employees, /api/reports/orders/employees, /api/reports/sales/employees, /api/reports/expenses/employees, /api/reports/incentives/employees, /api/reports/customers/:customerId/visits, /api/reports/date-wise, /api/employees, /api/customers
// Data schemas: EmployeeVisitReport, EmployeeOrderReport, EmployeeSalesReport, EmployeeExpenseReport, EmployeeIncentiveReport, CustomerVisitHistory, DateWiseReport, QueryReportsParams

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { reportsApi } from '@/lib/api/reports';
import { employeesApi } from '@/lib/api/employees';
import { customersApi } from '@/lib/api/customers';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Calendar,
  ShoppingBag,
  IndianRupee,
  Receipt,
  Award,
  Users,
  Building,
  Filter,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  FileText,
  AlertCircle,
  Download,
  Printer,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { ExpenseType } from '@/types/expense.types';
import type { IncentiveStatus } from '@/types/incentive.types';
import type { QueryReportsParams } from '@/types/report.types';

type ReportTab =
  | 'visits'
  | 'orders'
  | 'sales'
  | 'expenses'
  | 'incentives'
  | 'customers'
  | 'date-wise';

type DatePreset = 'THIS_MONTH' | 'THIS_WEEK' | 'TODAY' | 'LAST_MONTH' | 'ALL' | 'CUSTOM';

export default function ReportsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const isAdmin = user?.role === 'ADMIN';

  // Active Tab
  const [activeTab, setActiveTab] = useState<ReportTab>('visits');

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');

  // Compute ISO date range based on preset
  const dateRange = useMemo(() => {
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
    return { startDate: undefined, endDate: undefined };
  }, [datePreset, customStartDate, customEndDate]);

  // Construct general report query params
  const queryParams: QueryReportsParams = useMemo(() => {
    const params: QueryReportsParams = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };

    if (isAdmin && selectedEmployeeId && selectedEmployeeId !== 'all') {
      params.employeeId = selectedEmployeeId;
    }

    if (activeTab === 'orders' && statusFilter !== 'all') {
      params.status = statusFilter;
    }

    if (activeTab === 'expenses') {
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (expenseTypeFilter !== 'all') {
        params.type = expenseTypeFilter as ExpenseType;
      }
    }

    if (activeTab === 'incentives' && paymentStatusFilter !== 'all') {
      params.paymentStatus = paymentStatusFilter as IncentiveStatus;
    }

    return params;
  }, [
    dateRange,
    isAdmin,
    selectedEmployeeId,
    activeTab,
    statusFilter,
    expenseTypeFilter,
    paymentStatusFilter,
  ]);

  // 1. Fetch Employees (Admin only)
  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-reports'],
    queryFn: () => employeesApi.list({ isActive: true, limit: 100 }),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Customers (for Customer Visit History)
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-reports'],
    queryFn: () => customersApi.list({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  // Select first customer if none is selected
  React.useEffect(() => {
    if (!selectedCustomerId && customersData?.items?.length) {
      setSelectedCustomerId(customersData.items[0]._id);
    }
  }, [customersData, selectedCustomerId]);

  // 3. Tab Queries
  const visitsQuery = useQuery({
    queryKey: ['report-visits', queryParams],
    queryFn: () => reportsApi.getEmployeeVisits(queryParams),
    enabled: activeTab === 'visits' && isAuthenticated,
  });

  const ordersQuery = useQuery({
    queryKey: ['report-orders', queryParams],
    queryFn: () => reportsApi.getEmployeeOrders(queryParams),
    enabled: activeTab === 'orders' && isAuthenticated,
  });

  const salesQuery = useQuery({
    queryKey: ['report-sales', queryParams],
    queryFn: () => reportsApi.getEmployeeSales(queryParams),
    enabled: activeTab === 'sales' && isAuthenticated,
  });

  const expensesQuery = useQuery({
    queryKey: ['report-expenses', queryParams],
    queryFn: () => reportsApi.getEmployeeExpenses(queryParams),
    enabled: activeTab === 'expenses' && isAuthenticated,
  });

  const incentivesQuery = useQuery({
    queryKey: ['report-incentives', queryParams],
    queryFn: () => reportsApi.getEmployeeIncentives(queryParams),
    enabled: activeTab === 'incentives' && isAuthenticated,
  });

  const customerVisitsQuery = useQuery({
    queryKey: [
      'report-customer-visits',
      selectedCustomerId,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: () =>
      reportsApi.getCustomerVisitHistory(selectedCustomerId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
    enabled: activeTab === 'customers' && !!selectedCustomerId && isAuthenticated,
  });

  const dateWiseQuery = useQuery({
    queryKey: ['report-date-wise', queryParams],
    queryFn: () => reportsApi.getDateWiseReport(queryParams),
    enabled: activeTab === 'date-wise' && isAuthenticated,
  });

  // Determine active query state
  const getCurrentQuery = () => {
    switch (activeTab) {
      case 'visits':
        return visitsQuery;
      case 'orders':
        return ordersQuery;
      case 'sales':
        return salesQuery;
      case 'expenses':
        return expensesQuery;
      case 'incentives':
        return incentivesQuery;
      case 'customers':
        return customerVisitsQuery;
      case 'date-wise':
        return dateWiseQuery;
    }
  };

  const activeQuery = getCurrentQuery();
  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;
  const isFetching = activeQuery.isFetching;

  // Print/Export Helper
  const handlePrint = () => {
    window.print();
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center space-y-2">
        <BarChart3 className="size-8 animate-pulse text-primary" />
        <p className="text-xs text-muted-foreground">Authenticating intelligence session...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="size-12 text-rose-400 mx-auto" />
        <h2 className="text-sm font-bold text-foreground font-heading">Authentication Required</h2>
        <p className="text-xs text-muted-foreground">
          You must be logged in to view reporting intelligence and field metrics.
        </p>
        <Button onClick={() => router.push('/login')} className="w-full text-xs">
          Proceed to Login
        </Button>
      </div>
    );
  }

  const tabsConfig = [
    { id: 'visits', label: '1. Visits', icon: Calendar },
    { id: 'orders', label: '2. Orders', icon: ShoppingBag },
    { id: 'sales', label: '3. Sales Value', icon: IndianRupee },
    { id: 'expenses', label: '4. Expenses', icon: Receipt },
    { id: 'incentives', label: '5. Incentives', icon: Award },
    { id: 'customers', label: '6. Customer History', icon: Users },
    { id: 'date-wise', label: '7. Date-Wise Matrix', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Business Intelligence & Reports"
        subtitle={
          isAdmin
            ? 'Executive aggregation across 7 operational dimensions, employee performance, and revenue matrices'
            : 'Personal performance telemetry, customer interactions, and field commission breakdown'
        }
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs gap-1.5 text-foreground hidden sm:inline-flex"
          >
            <Printer className="size-3.5" />
            <span>Export View</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeQuery.refetch()}
            disabled={isFetching}
            className="h-8 text-xs gap-1.5 text-foreground"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>Refresh Data</span>
          </Button>
        </div>
      </PageHeader>

      {/* Navigation Tabs Pill Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/80 scrollbar-none">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Parameters Card */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-border/60 flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Filter className="size-3.5 text-primary" />
              Filter Parameters & Scope
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              {isAdmin
                ? 'Refine aggregate report calculations by date range, staff member, and operational statuses'
                : 'Personal metrics isolated automatically to your employee ID'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Date Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/20 border border-border/60 p-1.5 rounded-lg text-xs font-medium">
            <Calendar className="size-3.5 text-muted-foreground ml-1 mr-0.5" />
            {(['THIS_MONTH', 'THIS_WEEK', 'TODAY', 'LAST_MONTH', 'ALL', 'CUSTOM'] as DatePreset[]).map(
              (preset) => (
                <button
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  className={`px-3 py-1 rounded-md text-xs transition-colors ${
                    datePreset === preset
                      ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
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
                    : 'Custom Dates'}
                </button>
              ),
            )}
          </div>

          {/* Granular Secondary Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
            {/* Custom Date Inputs */}
            {datePreset === 'CUSTOM' && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}

            {/* Employee Selector (Admin Only) */}
            {isAdmin && activeTab !== 'customers' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Employee Scope</Label>
                <Select
                  value={selectedEmployeeId}
                  onValueChange={(val: string) => setSelectedEmployeeId(val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Active Staff</SelectItem>
                    {employeesData?.items?.map((emp) => (
                      <SelectItem key={emp._id} value={emp._id}>
                        {emp.name} ({emp.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Customer Selector (for Customer Visit History) */}
            {activeTab === 'customers' && (
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Select Customer Account</Label>
                <Select
                  value={selectedCustomerId}
                  onValueChange={(val: string) => setSelectedCustomerId(val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customersData?.items?.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.customerName || (c as any).name} - {c.businessName} ({c.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status Filter for Orders */}
            {activeTab === 'orders' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Order Status</Label>
                <Select value={statusFilter} onValueChange={(val: string) => setStatusFilter(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status & Category Filter for Expenses */}
            {activeTab === 'expenses' && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Expense Status</Label>
                  <Select value={statusFilter} onValueChange={(val: string) => setStatusFilter(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Expense Type</Label>
                  <Select
                    value={expenseTypeFilter}
                    onValueChange={(val: string) => setExpenseTypeFilter(val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="FUEL">Fuel</SelectItem>
                      <SelectItem value="TRAVEL">Travel</SelectItem>
                      <SelectItem value="FOOD">Food</SelectItem>
                      <SelectItem value="ACCOMMODATION">Accommodation</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Payment Status for Incentives */}
            {activeTab === 'incentives' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Payment Status</Label>
                <Select
                  value={paymentStatusFilter}
                  onValueChange={(val: string) => setPaymentStatusFilter(val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PAID">Paid (Disbursed)</SelectItem>
                    <SelectItem value="UNPAID">Unpaid (Accrued)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-16 text-center space-y-2">
          <BarChart3 className="size-8 animate-pulse text-primary" />
          <p className="text-xs text-muted-foreground">Aggregating database report records...</p>
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <Card className="p-8 text-center border-rose-500/20 bg-rose-500/10">
          <AlertCircle className="size-10 text-rose-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-rose-300 font-heading">
            Failed to Load Report Data
          </h3>
          <p className="text-xs text-rose-200/90 mt-1 max-w-md mx-auto">
            An error occurred while compiling the report pipeline. Please check network connection or retry.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeQuery.refetch()}
            className="mt-4 gap-1.5 text-xs text-foreground"
          >
            <RefreshCw className="size-3.5" />
            Retry Query
          </Button>
        </Card>
      )}

      {/* Report Content Panels */}
      {!isLoading && !isError && (
        <>
          {/* 1. EMPLOYEE VISITS REPORT */}
          {activeTab === 'visits' && (
            <div className="space-y-4">
              {(() => {
                const rows = visitsQuery.data || [];
                const totalVisits = rows.reduce((acc, r) => acc + (r.count || 0), 0);
                const topPerformer = [...rows].sort((a, b) => b.count - a.count)[0];

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                      title="Total Field Visits"
                      value={formatNumber(totalVisits)}
                      description={`Across ${rows.length} employee record(s)`}
                      icon={Calendar}
                      variant="primary"
                    />

                    <StatCard
                      title="Top Field Performer"
                      value={topPerformer ? topPerformer.employeeName : 'N/A'}
                      description={topPerformer ? `${topPerformer.count} visit interactions` : 'No data recorded'}
                      icon={Award}
                      variant="success"
                    />

                    <StatCard
                      title="Temporal Resolution"
                      value="Visit.visitDate"
                      description="Authoritative field timestamp"
                      icon={Clock}
                      variant="default"
                    />
                  </div>
                );
              })()}

              <Card className="bg-card border-border overflow-hidden">
                <CardHeader className="p-4 border-b border-border/60">
                  <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="size-3.5 text-primary" />
                    Employee-Wise Visits Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Field Representative</th>
                          <th className="px-4 py-2.5 text-right">Total Visits</th>
                          <th className="px-4 py-2.5 text-right">Activity Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {visitsQuery.data && visitsQuery.data.length > 0 ? (
                          (() => {
                            const total = visitsQuery.data.reduce((acc, r) => acc + r.count, 0) || 1;
                            return visitsQuery.data.map((row) => (
                              <tr
                                key={row.employeeId}
                                className="hover:bg-muted/20 transition-colors"
                              >
                                <td className="px-4 py-2.5 font-medium text-foreground">
                                  <div className="flex items-center gap-2">
                                    <div className="size-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[10px]">
                                      {row.employeeName.charAt(0)}
                                    </div>
                                    <span>{row.employeeName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                                  {formatNumber(row.count)}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-24 bg-muted/40 border border-border/60 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="bg-primary h-full rounded-full"
                                        style={{ width: `${Math.min(100, Math.round((row.count / total) * 100))}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] text-muted-foreground w-8 text-right font-mono">
                                      {Math.round((row.count / total) * 100)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ));
                          })()
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                              No visit report data available for the selected period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 2. EMPLOYEE ORDERS REPORT */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {(() => {
                const rows = ordersQuery.data || [];
                const totalOrders = rows.reduce((acc, r) => acc + (r.totalOrders || 0), 0);
                const approvedOrders = rows.reduce((acc, r) => acc + (r.approvedOrders || 0), 0);
                const pendingOrders = rows.reduce((acc, r) => acc + (r.pendingOrders || 0), 0);
                const completedOrders = rows.reduce((acc, r) => acc + (r.completedOrders || 0), 0);

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard
                      title="Total Orders"
                      value={formatNumber(totalOrders)}
                      description="Matching date filter"
                      icon={ShoppingBag}
                      variant="primary"
                    />

                    <StatCard
                      title="Approved Orders"
                      value={formatNumber(approvedOrders)}
                      description="Ready for fulfillment"
                      icon={CheckCircle2}
                      variant="success"
                    />

                    <StatCard
                      title="Completed Orders"
                      value={formatNumber(completedOrders)}
                      description="Delivered & fulfilled"
                      icon={TrendingUp}
                      variant="default"
                    />

                    <StatCard
                      title="Pending Orders"
                      value={formatNumber(pendingOrders)}
                      description="Awaiting admin review"
                      icon={Clock}
                      variant="warning"
                    />
                  </div>
                );
              })()}

              <Card className="bg-card border-border overflow-hidden">
                <CardHeader className="p-4 border-b border-border/60">
                  <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <ShoppingBag className="size-3.5 text-primary" />
                    Employee-Wise Order Breakdown by Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Field Representative</th>
                          <th className="px-4 py-2.5 text-right">Total Orders</th>
                          <th className="px-4 py-2.5 text-right text-amber-400">Pending</th>
                          <th className="px-4 py-2.5 text-right text-emerald-400">Approved</th>
                          <th className="px-4 py-2.5 text-right text-rose-400">Rejected</th>
                          <th className="px-4 py-2.5 text-right text-blue-400">Completed</th>
                          <th className="px-4 py-2.5 text-right text-muted-foreground">Cancelled</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {ordersQuery.data && ordersQuery.data.length > 0 ? (
                          ordersQuery.data.map((row) => (
                            <tr
                              key={row.employeeId}
                              className="hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-4 py-2.5 font-medium text-foreground">
                                {row.employeeName}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                                {formatNumber(row.totalOrders)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-amber-400 font-medium">
                                {formatNumber(row.pendingOrders)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-emerald-400 font-semibold">
                                {formatNumber(row.approvedOrders)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-rose-400 font-medium">
                                {formatNumber(row.rejectedOrders)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-blue-400 font-semibold">
                                {formatNumber(row.completedOrders)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-muted-foreground font-medium">
                                {formatNumber(row.cancelledOrders)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                              No order report data available for the selected period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 3. EMPLOYEE SALES / ORDER VALUE REPORT */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              {(() => {
                const rows = salesQuery.data || [];
                const totalValue = rows.reduce((acc, r) => acc + (r.totalOrderValue || 0), 0);
                const approvedValue = rows.reduce((acc, r) => acc + (r.approvedOrderValue || 0), 0);
                const completedValue = rows.reduce((acc, r) => acc + (r.completedOrderValue || 0), 0);
                const totalOrders = rows.reduce((acc, r) => acc + (r.orderCount || 0), 0);

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard
                      title="Total Order Value"
                      value={<CurrencyDisplay amount={totalValue} />}
                      description={`From ${formatNumber(totalOrders)} valid order(s)`}
                      icon={IndianRupee}
                      variant="primary"
                    />

                    <StatCard
                      title="Approved Sales Value"
                      value={<CurrencyDisplay amount={approvedValue} />}
                      description="Status = APPROVED"
                      icon={CheckCircle2}
                      variant="success"
                    />

                    <StatCard
                      title="Completed Sales Value"
                      value={<CurrencyDisplay amount={completedValue} />}
                      description="Status = COMPLETED"
                      icon={TrendingUp}
                      variant="default"
                    />

                    <StatCard
                      title="Avg Order Value"
                      value={
                        <CurrencyDisplay
                          amount={totalOrders > 0 ? totalValue / totalOrders : 0}
                        />
                      }
                      description="Total Value / Total Count"
                      icon={Receipt}
                      variant="default"
                    />
                  </div>
                );
              })()}

              <Card className="bg-card border-border overflow-hidden">
                <CardHeader className="p-4 border-b border-border/60">
                  <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <IndianRupee className="size-3.5 text-primary" />
                    Employee-Wise Sales & Order Value
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Field Representative</th>
                          <th className="px-4 py-2.5 text-right">Orders</th>
                          <th className="px-4 py-2.5 text-right">Total Value</th>
                          <th className="px-4 py-2.5 text-right text-emerald-400">Approved Value</th>
                          <th className="px-4 py-2.5 text-right text-blue-400">Completed Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {salesQuery.data && salesQuery.data.length > 0 ? (
                          salesQuery.data.map((row) => (
                            <tr
                              key={row.employeeId}
                              className="hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-4 py-2.5 font-medium text-foreground">
                                {row.employeeName}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                                {formatNumber(row.orderCount)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                                <CurrencyDisplay amount={row.totalOrderValue} />
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-400">
                                <CurrencyDisplay amount={row.approvedOrderValue} />
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-semibold text-blue-400">
                                <CurrencyDisplay amount={row.completedOrderValue} />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                              No sales report data available for the selected period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 4. EMPLOYEE EXPENSES REPORT */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              {(() => {
                const rows = expensesQuery.data || [];
                const totalSubmitted = rows.reduce(
                  (acc, r) => acc + (r.totalSubmittedExpenses || 0),
                  0,
                );
                const approvedAmount = rows.reduce(
                  (acc, r) => acc + (r.approvedExpenseAmount || 0),
                  0,
                );
                const pendingAmount = rows.reduce(
                  (acc, r) => acc + (r.pendingExpenseAmount || 0),
                  0,
                );
                const rejectedAmount = rows.reduce(
                  (acc, r) => acc + (r.rejectedExpenseAmount || 0),
                  0,
                );

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard
                      title="Total Submitted Expenses"
                      value={<CurrencyDisplay amount={totalSubmitted} />}
                      description="All claims in period"
                      icon={Receipt}
                      variant="primary"
                    />

                    <StatCard
                      title="Approved Expenses"
                      value={<CurrencyDisplay amount={approvedAmount} />}
                      description="Approved for payment"
                      icon={CheckCircle2}
                      variant="success"
                    />

                    <StatCard
                      title="Pending Expenses"
                      value={<CurrencyDisplay amount={pendingAmount} />}
                      description="Awaiting verification"
                      icon={Clock}
                      variant="warning"
                    />

                    <StatCard
                      title="Rejected Expenses"
                      value={<CurrencyDisplay amount={rejectedAmount} />}
                      description="Disallowed claims"
                      icon={XCircle}
                      variant="danger"
                    />
                  </div>
                );
              })()}

              <Card className="bg-card border-border overflow-hidden">
                <CardHeader className="p-4 border-b border-border/60">
                  <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Receipt className="size-3.5 text-primary" />
                    Employee-Wise Expenses Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Field Representative</th>
                          <th className="px-4 py-2.5 text-right">Claims</th>
                          <th className="px-4 py-2.5 text-right">Total Submitted</th>
                          <th className="px-4 py-2.5 text-right text-amber-400">Pending</th>
                          <th className="px-4 py-2.5 text-right text-emerald-400">Approved</th>
                          <th className="px-4 py-2.5 text-right text-rose-400">Rejected</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {expensesQuery.data && expensesQuery.data.length > 0 ? (
                          expensesQuery.data.map((row) => (
                            <tr
                              key={row.employeeId}
                              className="hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-4 py-2.5 font-medium text-foreground">
                                {row.employeeName}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                                {formatNumber(row.expenseCount)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                                <CurrencyDisplay amount={row.totalSubmittedExpenses} />
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-amber-400 font-medium">
                                <CurrencyDisplay amount={row.pendingExpenseAmount} />
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-emerald-400 font-semibold">
                                <CurrencyDisplay amount={row.approvedExpenseAmount} />
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-rose-400 font-medium">
                                <CurrencyDisplay amount={row.rejectedExpenseAmount} />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                              No expense report data available for the selected period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 5. EMPLOYEE INCENTIVES REPORT */}
          {activeTab === 'incentives' && (
            <div className="space-y-4">
              {(() => {
                const rows = incentivesQuery.data || [];
                const totalIncentives = rows.reduce(
                  (acc, r) => acc + (r.totalIncentives || 0),
                  0,
                );
                const paidIncentives = rows.reduce(
                  (acc, r) => acc + (r.paidIncentives || 0),
                  0,
                );
                const unpaidIncentives = rows.reduce(
                  (acc, r) => acc + (r.unpaidIncentives || 0),
                  0,
                );
                const incentiveCount = rows.reduce(
                  (acc, r) => acc + (r.incentiveCount || 0),
                  0,
                );

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard
                      title="Total Accrued Incentives"
                      value={<CurrencyDisplay amount={totalIncentives} />}
                      description={`${formatNumber(incentiveCount)} incentive line items`}
                      icon={Award}
                      variant="primary"
                    />

                    <StatCard
                      title="Disbursed (Paid)"
                      value={<CurrencyDisplay amount={paidIncentives} />}
                      description="Status = PAID"
                      icon={CheckCircle2}
                      variant="success"
                    />

                    <StatCard
                      title="Pending Payout (Unpaid)"
                      value={<CurrencyDisplay amount={unpaidIncentives} />}
                      description="Status = UNPAID"
                      icon={Clock}
                      variant="warning"
                    />

                    <StatCard
                      title="Settlement Ratio"
                      value={
                        totalIncentives > 0
                          ? `${Math.round((paidIncentives / totalIncentives) * 100)}%`
                          : '0%'
                      }
                      description="Disbursed vs Total Accrued"
                      icon={TrendingUp}
                      variant="default"
                    />
                  </div>
                );
              })()}

              <Card className="bg-card border-border overflow-hidden">
                <CardHeader className="p-4 border-b border-border/60">
                  <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Award className="size-3.5 text-primary" />
                    Employee-Wise Incentives Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Field Representative</th>
                          <th className="px-4 py-2.5 text-right">Incentive Items</th>
                          <th className="px-4 py-2.5 text-right">Total Incentive</th>
                          <th className="px-4 py-2.5 text-right text-amber-400">Unpaid Amount</th>
                          <th className="px-4 py-2.5 text-right text-emerald-400">Paid Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {incentivesQuery.data && incentivesQuery.data.length > 0 ? (
                          incentivesQuery.data.map((row) => (
                            <tr
                              key={row.employeeId}
                              className="hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-4 py-2.5 font-medium text-foreground">
                                {row.employeeName}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                                {formatNumber(row.incentiveCount)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                                <CurrencyDisplay amount={row.totalIncentives} />
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-amber-400 font-semibold">
                                <CurrencyDisplay amount={row.unpaidIncentives} />
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-emerald-400 font-semibold">
                                <CurrencyDisplay amount={row.paidIncentives} />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                              No incentive report data available for the selected period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 6. CUSTOMER VISIT HISTORY */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              {customerVisitsQuery.data?.customer && (
                <Card className="bg-card border-border">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground font-heading">
                            {customerVisitsQuery.data.customer.customerName}
                          </h3>
                          <StatusBadge status={customerVisitsQuery.data.customer.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {customerVisitsQuery.data.customer.businessName} · Phone: {customerVisitsQuery.data.customer.phone}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Address: {customerVisitsQuery.data.customer.address}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {customerVisitsQuery.data.customer.assignedEmployeeName && (
                          <div className="text-right text-xs">
                            <span className="text-muted-foreground">Assigned Field Rep:</span>
                            <p className="font-semibold text-foreground">
                              {customerVisitsQuery.data.customer.assignedEmployeeName}
                            </p>
                          </div>
                        )}

                        <Link
                          href={`/customers/${customerVisitsQuery.data.customer.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline p-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
                        >
                          <span>Customer Profile</span>
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-card border-border overflow-hidden">
                <CardHeader className="p-4 border-b border-border/60">
                  <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Users className="size-3.5 text-primary" />
                    Chronological Visit History (Newest First)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Visit Date</th>
                          <th className="px-4 py-2.5">Field Rep</th>
                          <th className="px-4 py-2.5">Purpose</th>
                          <th className="px-4 py-2.5">Outcome / Result</th>
                          <th className="px-4 py-2.5">Follow-Up Date</th>
                          <th className="px-4 py-2.5">Field Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {customerVisitsQuery.data?.visits &&
                        customerVisitsQuery.data.visits.length > 0 ? (
                          customerVisitsQuery.data.visits.map((v) => (
                            <tr
                              key={v.id}
                              className="hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-4 py-2.5 font-semibold text-foreground whitespace-nowrap">
                                {formatDate(v.visitDate)}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-foreground">
                                {v.employeeName}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-foreground">
                                {v.purpose}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/40 border border-border/60 text-foreground">
                                  {v.result}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                                {v.followUpDate ? formatDate(v.followUpDate) : '-'}
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate">
                                {v.notes || '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                              No visit history recorded for this customer in the selected date range.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 7. DATE-WISE REPORT */}
          {activeTab === 'date-wise' && (
            <div className="space-y-4">
              {(() => {
                const rows = dateWiseQuery.data || [];
                const totalOrders = rows.reduce((acc, r) => acc + (r.orders || 0), 0);
                const totalValue = rows.reduce((acc, r) => acc + (r.orderValue || 0), 0);
                const totalExpenses = rows.reduce((acc, r) => acc + (r.expenses || 0), 0);
                const totalIncentives = rows.reduce((acc, r) => acc + (r.incentives || 0), 0);
                const totalVisits = rows.reduce((acc, r) => acc + (r.visits || 0), 0);

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <StatCard
                      title="Total Visits"
                      value={formatNumber(totalVisits)}
                      description="Across field"
                      icon={Calendar}
                      variant="default"
                    />

                    <StatCard
                      title="Total Orders"
                      value={formatNumber(totalOrders)}
                      description="All submissions"
                      icon={ShoppingBag}
                      variant="default"
                    />

                    <StatCard
                      title="Order Value"
                      value={<CurrencyDisplay amount={totalValue} />}
                      description="Gross commercial"
                      icon={IndianRupee}
                      variant="primary"
                    />

                    <StatCard
                      title="Total Expenses"
                      value={<CurrencyDisplay amount={totalExpenses} />}
                      description="All claims"
                      icon={Receipt}
                      variant="warning"
                    />

                    <StatCard
                      title="Incentives"
                      value={<CurrencyDisplay amount={totalIncentives} />}
                      description="Accrued commission"
                      icon={Award}
                      variant="success"
                    />
                  </div>
                );
              })()}

              <Card className="bg-card border-border overflow-hidden">
                <CardHeader className="p-4 border-b border-border/60">
                  <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="size-3.5 text-primary" />
                    Date-Wise Cross-Functional Operational Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5 text-right">Visits</th>
                          <th className="px-4 py-2.5 text-right">Orders</th>
                          <th className="px-4 py-2.5 text-right">Order Value</th>
                          <th className="px-4 py-2.5 text-right text-emerald-400">Approved Orders</th>
                          <th className="px-4 py-2.5 text-right text-emerald-400">Approved Value</th>
                          <th className="px-4 py-2.5 text-right text-amber-400">Expenses</th>
                          <th className="px-4 py-2.5 text-right text-amber-400">Approved Exp</th>
                          <th className="px-4 py-2.5 text-right text-blue-400">Incentives</th>
                          <th className="px-4 py-2.5 text-right text-blue-400">Paid Inc</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {dateWiseQuery.data && dateWiseQuery.data.length > 0 ? (
                          dateWiseQuery.data.map((row) => (
                            <tr
                              key={row.date}
                              className="hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-4 py-2.5 font-bold text-foreground whitespace-nowrap">
                                {formatDate(row.date)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                                {formatNumber(row.visits)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                                {formatNumber(row.orders)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground">
                                <CurrencyDisplay amount={row.orderValue} />
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-emerald-400 font-medium">
                                {formatNumber(row.approvedOrders)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-emerald-400 font-semibold">
                                <CurrencyDisplay amount={row.approvedOrderValue} />
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-amber-400 font-medium">
                                <CurrencyDisplay amount={row.expenses} />
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-amber-400 font-medium">
                                <CurrencyDisplay amount={row.approvedExpenses} />
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-blue-400 font-medium">
                                <CurrencyDisplay amount={row.incentives} />
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-blue-400 font-medium">
                                <CurrencyDisplay amount={row.paidIncentives} />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                              No operational report data available for the selected period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
