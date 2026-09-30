// User instruction: "Phase 10: Reports - Create the frontend Reports page with tabs for all 7 reporting dimensions, reusable filters, and Indian currency/date formatting"
// Importers/callers: Next.js App Router (/reports)
// Affected API: /api/reports/visits/employees, /api/reports/orders/employees, /api/reports/sales/employees, /api/reports/expenses/employees, /api/reports/incentives/employees, /api/reports/customers/:customerId/visits, /api/reports/date-wise
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
  Shield,
  Briefcase,
  LogOut,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  Car,
  Plane,
  Utensils,
  Hotel,
  HelpCircle,
  TrendingUp,
  MapPin,
  FileText,
  AlertCircle,
} from 'lucide-react';
import type { ExpenseType } from '@/types/expense.types';
import type { IncentiveStatus } from '@/types/incentive.types';
import type { OrderStatus } from '@/types/order.types';
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
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Authenticating user session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <AlertCircle className="size-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold">Authentication Required</h2>
          <p className="text-sm text-zinc-500">
            You must be logged in to view reporting intelligence.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Proceed to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="size-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold leading-none text-zinc-900 dark:text-zinc-100">
                  Reports & Analytics
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {isAdmin ? 'Admin Console' : 'Field Operations'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Marketing Management System · Comprehensive Intelligence
              </p>
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
              onClick={logout}
              className="gap-1.5 text-xs text-zinc-700 dark:text-zinc-300"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-zinc-200 dark:border-zinc-800 scrollbar-none">
          <button
            onClick={() => setActiveTab('visits')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'visits'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Calendar className="size-4" />
            1. Visits
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'orders'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <ShoppingBag className="size-4" />
            2. Orders
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'sales'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <IndianRupee className="size-4" />
            3. Sales / Order Value
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'expenses'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Receipt className="size-4" />
            4. Expenses
          </button>
          <button
            onClick={() => setActiveTab('incentives')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'incentives'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Award className="size-4" />
            5. Incentives
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'customers'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Users className="size-4" />
            6. Customer History
          </button>
          <button
            onClick={() => setActiveTab('date-wise')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'date-wise'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <BarChart3 className="size-4" />
            7. Date-Wise Operations
          </button>
        </div>

        {/* Filter Bar Card */}
        <Card className="shadow-xs border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <Filter className="size-4 text-emerald-600" />
                  Filter Parameters
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAdmin
                    ? 'Refine aggregate report calculations by date range, staff member, and operational statuses'
                    : 'Personal report metrics automatically isolated to your authenticated account'}
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => activeQuery.refetch()}
                disabled={isFetching}
                className="gap-1.5 text-xs self-end sm:self-auto"
              >
                <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh Report
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 px-4 sm:px-6 pb-4">
            {/* Date Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-lg text-xs font-medium">
              <Calendar className="size-3.5 text-zinc-500 ml-1 mr-0.5" />
              {(['THIS_MONTH', 'THIS_WEEK', 'TODAY', 'LAST_MONTH', 'ALL', 'CUSTOM'] as DatePreset[]).map(
                (preset) => (
                  <button
                    key={preset}
                    onClick={() => setDatePreset(preset)}
                    className={`px-3 py-1 rounded-md transition-colors ${
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
                    <Label className="text-xs text-zinc-600 dark:text-zinc-400">Start Date</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-600 dark:text-zinc-400">End Date</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                </>
              )}

              {/* Employee Selector (Admin Only) */}
              {isAdmin && activeTab !== 'customers' && (
                <div>
                  <Label className="text-xs text-zinc-600 dark:text-zinc-400">Employee Scope</Label>
                  <Select
                    value={selectedEmployeeId}
                    onValueChange={(val: string) => setSelectedEmployeeId(val)}
                  >
                    <SelectTrigger className="h-9 text-xs mt-1">
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
                  <Label className="text-xs text-zinc-600 dark:text-zinc-400">Select Customer Account</Label>
                  <Select
                    value={selectedCustomerId}
                    onValueChange={(val: string) => setSelectedCustomerId(val)}
                  >
                    <SelectTrigger className="h-9 text-xs mt-1">
                      <SelectValue placeholder="Select customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customersData?.items?.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.customerName} - {c.businessName} ({c.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status Filter for Orders */}
              {activeTab === 'orders' && (
                <div>
                  <Label className="text-xs text-zinc-600 dark:text-zinc-400">Order Status</Label>
                  <Select value={statusFilter} onValueChange={(val: string) => setStatusFilter(val)}>
                    <SelectTrigger className="h-9 text-xs mt-1">
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

              {/* Status Filter for Expenses */}
              {activeTab === 'expenses' && (
                <>
                  <div>
                    <Label className="text-xs text-zinc-600 dark:text-zinc-400">Expense Status</Label>
                    <Select value={statusFilter} onValueChange={(val: string) => setStatusFilter(val)}>
                      <SelectTrigger className="h-9 text-xs mt-1">
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
                    <Label className="text-xs text-zinc-600 dark:text-zinc-400">Expense Type</Label>
                    <Select
                      value={expenseTypeFilter}
                      onValueChange={(val: string) => setExpenseTypeFilter(val)}
                    >
                      <SelectTrigger className="h-9 text-xs mt-1">
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
                  <Label className="text-xs text-zinc-600 dark:text-zinc-400">Payment Status</Label>
                  <Select
                    value={paymentStatusFilter}
                    onValueChange={(val: string) => setPaymentStatusFilter(val)}
                  >
                    <SelectTrigger className="h-9 text-xs mt-1">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="UNPAID">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="size-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Aggregating database report records...
            </p>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <Card className="p-8 text-center border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20">
            <AlertCircle className="size-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
              Failed to Load Report Data
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 max-w-md mx-auto">
              An error occurred while compiling the report pipeline. Please check your permissions or network connection.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => activeQuery.refetch()}
              className="mt-4 gap-1.5"
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
                {/* Summary Metrics */}
                {(() => {
                  const rows = visitsQuery.data || [];
                  const totalVisits = rows.reduce((acc, r) => acc + (r.count || 0), 0);
                  const topPerformer = [...rows].sort((a, b) => b.count - a.count)[0];

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-zinc-500">
                            Total Visits Recorded
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {formatNumber(totalVisits)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Across {rows.length} employee record(s)
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-zinc-500">
                            Top Field Performer
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {topPerformer ? topPerformer.employeeName : '-'}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {topPerformer ? `${topPerformer.count} visit interactions` : 'No data recorded'}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-zinc-500">
                            Date Semantic Reference
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                            Visit.visitDate
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Authoritative field interaction timestamp
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}

                {/* Table Card */}
                <Card className="shadow-xs overflow-hidden">
                  <CardHeader className="py-3 px-4 sm:px-6 border-b">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Calendar className="size-4 text-emerald-600" />
                      Employee-Wise Visits Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-semibold border-b">
                          <tr>
                            <th className="py-3 px-4">Employee</th>
                            <th className="py-3 px-4 text-right">Total Visits</th>
                            <th className="py-3 px-4 text-right">Activity Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {visitsQuery.data && visitsQuery.data.length > 0 ? (
                            (() => {
                              const total = visitsQuery.data.reduce((acc, r) => acc + r.count, 0) || 1;
                              return visitsQuery.data.map((row) => (
                                <tr
                                  key={row.employeeId}
                                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                                >
                                  <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                                    <div className="flex items-center gap-2">
                                      <div className="size-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                                        {row.employeeName.charAt(0)}
                                      </div>
                                      <span>{row.employeeName}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                    {formatNumber(row.count)}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className="bg-emerald-600 h-full rounded-full"
                                          style={{ width: `${Math.min(100, Math.round((row.count / total) * 100))}%` }}
                                        />
                                      </div>
                                      <span className="text-[11px] text-zinc-500 w-8 text-right font-mono">
                                        {Math.round((row.count / total) * 100)}%
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ));
                            })()
                          ) : (
                            <tr>
                              <td colSpan={3} className="py-12 text-center text-zinc-500">
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
                {/* Summary Metrics */}
                {(() => {
                  const rows = ordersQuery.data || [];
                  const totalOrders = rows.reduce((acc, r) => acc + (r.totalOrders || 0), 0);
                  const approvedOrders = rows.reduce((acc, r) => acc + (r.approvedOrders || 0), 0);
                  const pendingOrders = rows.reduce((acc, r) => acc + (r.pendingOrders || 0), 0);
                  const completedOrders = rows.reduce((acc, r) => acc + (r.completedOrders || 0), 0);

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-zinc-500">
                            Total Orders
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {formatNumber(totalOrders)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Matching date filter</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-emerald-600">
                            Approved Orders
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatNumber(approvedOrders)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Ready for fulfillment</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-blue-600">
                            Completed Orders
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {formatNumber(completedOrders)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Delivered & fulfilled</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-amber-600">
                            Pending Orders
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {formatNumber(pendingOrders)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Awaiting admin review</p>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}

                {/* Table Card */}
                <Card className="shadow-xs overflow-hidden">
                  <CardHeader className="py-3 px-4 sm:px-6 border-b">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <ShoppingBag className="size-4 text-emerald-600" />
                      Employee-Wise Order Breakdown by Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-semibold border-b">
                          <tr>
                            <th className="py-3 px-4">Employee</th>
                            <th className="py-3 px-4 text-right">Total Orders</th>
                            <th className="py-3 px-4 text-right text-amber-600">Pending</th>
                            <th className="py-3 px-4 text-right text-emerald-600">Approved</th>
                            <th className="py-3 px-4 text-right text-rose-600">Rejected</th>
                            <th className="py-3 px-4 text-right text-blue-600">Completed</th>
                            <th className="py-3 px-4 text-right text-zinc-500">Cancelled</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {ordersQuery.data && ordersQuery.data.length > 0 ? (
                            ordersQuery.data.map((row) => (
                              <tr
                                key={row.employeeId}
                                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                              >
                                <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                                  {row.employeeName}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                  {formatNumber(row.totalOrders)}
                                </td>
                                <td className="py-3 px-4 text-right text-amber-600 font-medium">
                                  {formatNumber(row.pendingOrders)}
                                </td>
                                <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                                  {formatNumber(row.approvedOrders)}
                                </td>
                                <td className="py-3 px-4 text-right text-rose-600 font-medium">
                                  {formatNumber(row.rejectedOrders)}
                                </td>
                                <td className="py-3 px-4 text-right text-blue-600 font-semibold">
                                  {formatNumber(row.completedOrders)}
                                </td>
                                <td className="py-3 px-4 text-right text-zinc-500 font-medium">
                                  {formatNumber(row.cancelledOrders)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-zinc-500">
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
                {/* Summary Metrics */}
                {(() => {
                  const rows = salesQuery.data || [];
                  const totalValue = rows.reduce((acc, r) => acc + (r.totalOrderValue || 0), 0);
                  const approvedValue = rows.reduce((acc, r) => acc + (r.approvedOrderValue || 0), 0);
                  const completedValue = rows.reduce((acc, r) => acc + (r.completedOrderValue || 0), 0);
                  const totalOrders = rows.reduce((acc, r) => acc + (r.orderCount || 0), 0);

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-zinc-500">
                            Total Order Value
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(totalValue)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            From {formatNumber(totalOrders)} valid order(s)
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-emerald-600">
                            Approved Sales Value
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(approvedValue)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Status = APPROVED
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-blue-600">
                            Completed Sales Value
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(completedValue)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Status = COMPLETED
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-zinc-500">
                            Avg Order Value
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(totalOrders > 0 ? totalValue / totalOrders : 0)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Authoritative Order.totalAmount</p>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}

                {/* Table Card */}
                <Card className="shadow-xs overflow-hidden">
                  <CardHeader className="py-3 px-4 sm:px-6 border-b">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <IndianRupee className="size-4 text-emerald-600" />
                      Employee-Wise Sales & Order Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-semibold border-b">
                          <tr>
                            <th className="py-3 px-4">Employee</th>
                            <th className="py-3 px-4 text-right">Orders</th>
                            <th className="py-3 px-4 text-right">Total Value</th>
                            <th className="py-3 px-4 text-right text-emerald-600">Approved Value</th>
                            <th className="py-3 px-4 text-right text-blue-600">Completed Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {salesQuery.data && salesQuery.data.length > 0 ? (
                            salesQuery.data.map((row) => (
                              <tr
                                key={row.employeeId}
                                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                              >
                                <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                                  {row.employeeName}
                                </td>
                                <td className="py-3 px-4 text-right font-medium">
                                  {formatNumber(row.orderCount)}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                  {formatCurrency(row.totalOrderValue)}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                                  {formatCurrency(row.approvedOrderValue)}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-blue-600">
                                  {formatCurrency(row.completedOrderValue)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-zinc-500">
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
                {/* Summary Metrics */}
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
                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-zinc-500">
                            Total Submitted Expenses
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(totalSubmitted)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">All claims in period</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-emerald-600">
                            Approved Expenses
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(approvedAmount)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Approved for payment</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-amber-600">
                            Pending Expenses
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(pendingAmount)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Awaiting verification</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-rose-600">
                            Rejected Expenses
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(rejectedAmount)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Disallowed claims</p>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}

                {/* Table Card */}
                <Card className="shadow-xs overflow-hidden">
                  <CardHeader className="py-3 px-4 sm:px-6 border-b">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Receipt className="size-4 text-emerald-600" />
                      Employee-Wise Expenses Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-semibold border-b">
                          <tr>
                            <th className="py-3 px-4">Employee</th>
                            <th className="py-3 px-4 text-right">Claims</th>
                            <th className="py-3 px-4 text-right">Total Submitted</th>
                            <th className="py-3 px-4 text-right text-amber-600">Pending</th>
                            <th className="py-3 px-4 text-right text-emerald-600">Approved</th>
                            <th className="py-3 px-4 text-right text-rose-600">Rejected</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {expensesQuery.data && expensesQuery.data.length > 0 ? (
                            expensesQuery.data.map((row) => (
                              <tr
                                key={row.employeeId}
                                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                              >
                                <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                                  {row.employeeName}
                                </td>
                                <td className="py-3 px-4 text-right font-medium">
                                  {formatNumber(row.expenseCount)}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                  {formatCurrency(row.totalSubmittedExpenses)}
                                </td>
                                <td className="py-3 px-4 text-right text-amber-600 font-medium">
                                  {formatCurrency(row.pendingExpenseAmount)}
                                </td>
                                <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                                  {formatCurrency(row.approvedExpenseAmount)}
                                </td>
                                <td className="py-3 px-4 text-right text-rose-600 font-medium">
                                  {formatCurrency(row.rejectedExpenseAmount)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-zinc-500">
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
                {/* Summary Metrics */}
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
                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-zinc-500">
                            Total Incentives
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(totalIncentives)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {formatNumber(incentiveCount)} incentive items
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-emerald-600">
                            Paid Incentives
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(paidIncentives)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Status = PAID</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-amber-600">
                            Unpaid Incentives
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(unpaidIncentives)}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Status = UNPAID</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-4">
                          <CardTitle className="text-xs font-medium text-zinc-500">
                            Settlement Ratio
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {totalIncentives > 0
                              ? `${Math.round((paidIncentives / totalIncentives) * 100)}%`
                              : '0%'}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Disbursed vs Accrued</p>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}

                {/* Table Card */}
                <Card className="shadow-xs overflow-hidden">
                  <CardHeader className="py-3 px-4 sm:px-6 border-b">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Award className="size-4 text-emerald-600" />
                      Employee-Wise Incentives Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-semibold border-b">
                          <tr>
                            <th className="py-3 px-4">Employee</th>
                            <th className="py-3 px-4 text-right">Incentive Items</th>
                            <th className="py-3 px-4 text-right">Total Incentive</th>
                            <th className="py-3 px-4 text-right text-amber-600">Unpaid Amount</th>
                            <th className="py-3 px-4 text-right text-emerald-600">Paid Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {incentivesQuery.data && incentivesQuery.data.length > 0 ? (
                            incentivesQuery.data.map((row) => (
                              <tr
                                key={row.employeeId}
                                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                              >
                                <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                                  {row.employeeName}
                                </td>
                                <td className="py-3 px-4 text-right font-medium">
                                  {formatNumber(row.incentiveCount)}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                  {formatCurrency(row.totalIncentives)}
                                </td>
                                <td className="py-3 px-4 text-right text-amber-600 font-semibold">
                                  {formatCurrency(row.unpaidIncentives)}
                                </td>
                                <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                                  {formatCurrency(row.paidIncentives)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-zinc-500">
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
                  <Card className="shadow-xs bg-zinc-50/50 dark:bg-zinc-900/50 border">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                              {customerVisitsQuery.data.customer.customerName}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                              {customerVisitsQuery.data.customer.status}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                            {customerVisitsQuery.data.customer.businessName} · Phone: {customerVisitsQuery.data.customer.phone}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Address: {customerVisitsQuery.data.customer.address}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {customerVisitsQuery.data.customer.assignedEmployeeName && (
                            <div className="text-right text-xs">
                              <span className="text-zinc-500">Assigned Representative:</span>
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {customerVisitsQuery.data.customer.assignedEmployeeName}
                              </p>
                            </div>
                          )}

                          <Link
                            href={`/customers/${customerVisitsQuery.data.customer.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 transition"
                          >
                            <span>Customer Profile</span>
                            <ExternalLink className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Visits History Table Card */}
                <Card className="shadow-xs overflow-hidden">
                  <CardHeader className="py-3 px-4 sm:px-6 border-b">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Users className="size-4 text-emerald-600" />
                      Chronological Visit History (Newest First)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-semibold border-b">
                          <tr>
                            <th className="py-3 px-4">Visit Date</th>
                            <th className="py-3 px-4">Field Rep</th>
                            <th className="py-3 px-4">Purpose</th>
                            <th className="py-3 px-4">Outcome / Result</th>
                            <th className="py-3 px-4">Follow-Up Date</th>
                            <th className="py-3 px-4">Field Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {customerVisitsQuery.data?.visits &&
                          customerVisitsQuery.data.visits.length > 0 ? (
                            customerVisitsQuery.data.visits.map((v) => (
                              <tr
                                key={v.id}
                                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                              >
                                <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                  {formatDate(v.visitDate)}
                                </td>
                                <td className="py-3 px-4 font-medium text-zinc-800 dark:text-zinc-200">
                                  {v.employeeName}
                                </td>
                                <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                                  {v.purpose}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                    {v.result}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                  {v.followUpDate ? formatDate(v.followUpDate) : '-'}
                                </td>
                                <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                                  {v.notes || '-'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-zinc-500">
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
                {/* Summary Metrics */}
                {(() => {
                  const rows = dateWiseQuery.data || [];
                  const totalOrders = rows.reduce((acc, r) => acc + (r.orders || 0), 0);
                  const totalValue = rows.reduce((acc, r) => acc + (r.orderValue || 0), 0);
                  const totalExpenses = rows.reduce((acc, r) => acc + (r.expenses || 0), 0);
                  const totalIncentives = rows.reduce((acc, r) => acc + (r.incentives || 0), 0);
                  const totalVisits = rows.reduce((acc, r) => acc + (r.visits || 0), 0);

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-3">
                          <CardTitle className="text-xs font-medium text-zinc-500">
                            Total Visits
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            {formatNumber(totalVisits)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-3">
                          <CardTitle className="text-xs font-medium text-zinc-500">
                            Total Orders
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            {formatNumber(totalOrders)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-3">
                          <CardTitle className="text-xs font-medium text-emerald-600">
                            Order Value
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(totalValue)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-3">
                          <CardTitle className="text-xs font-medium text-purple-600">
                            Total Expenses
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                            {formatCurrency(totalExpenses)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-2xs">
                        <CardHeader className="pb-1 pt-3 px-3">
                          <CardTitle className="text-xs font-medium text-blue-600">
                            Incentives
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(totalIncentives)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}

                {/* Table Card */}
                <Card className="shadow-xs overflow-hidden">
                  <CardHeader className="py-3 px-4 sm:px-6 border-b">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <BarChart3 className="size-4 text-emerald-600" />
                      Date-Wise Cross-Functional Operational Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-semibold border-b">
                          <tr>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4 text-right">Visits</th>
                            <th className="py-3 px-4 text-right">Orders</th>
                            <th className="py-3 px-4 text-right">Order Value</th>
                            <th className="py-3 px-4 text-right text-emerald-600">Approved Orders</th>
                            <th className="py-3 px-4 text-right text-emerald-600">Approved Value</th>
                            <th className="py-3 px-4 text-right text-purple-600">Expenses</th>
                            <th className="py-3 px-4 text-right text-purple-600">Approved Exp</th>
                            <th className="py-3 px-4 text-right text-blue-600">Incentives</th>
                            <th className="py-3 px-4 text-right text-blue-600">Paid Inc</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {dateWiseQuery.data && dateWiseQuery.data.length > 0 ? (
                            dateWiseQuery.data.map((row) => (
                              <tr
                                key={row.date}
                                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                              >
                                <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                  {formatDate(row.date)}
                                </td>
                                <td className="py-3 px-4 text-right font-medium">
                                  {formatNumber(row.visits)}
                                </td>
                                <td className="py-3 px-4 text-right font-medium">
                                  {formatNumber(row.orders)}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                                  {formatCurrency(row.orderValue)}
                                </td>
                                <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                                  {formatNumber(row.approvedOrders)}
                                </td>
                                <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                                  {formatCurrency(row.approvedOrderValue)}
                                </td>
                                <td className="py-3 px-4 text-right text-purple-600 font-medium">
                                  {formatCurrency(row.expenses)}
                                </td>
                                <td className="py-3 px-4 text-right text-purple-600 font-medium">
                                  {formatCurrency(row.approvedExpenses)}
                                </td>
                                <td className="py-3 px-4 text-right text-blue-600 font-medium">
                                  {formatCurrency(row.incentives)}
                                </td>
                                <td className="py-3 px-4 text-right text-blue-600 font-medium">
                                  {formatCurrency(row.paidIncentives)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={10} className="py-12 text-center text-zinc-500">
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
      </main>
    </div>
  );
}
