// User instruction: "Phase 7: Employee Incentive Management - Create frontend Incentives list and rule management UI"
// Importers/callers: Next.js App Router (/incentives)
// Affected API: /api/incentives (list, getActiveRule, updateActiveRule, markAsPaid), /api/employees (list)
// Data schemas: Incentive, IncentiveRule, IncentiveStatus, IncentiveSummary, IncentiveListResponse

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { incentivesApi } from '@/lib/api/incentives';
import { employeesApi } from '@/lib/api/employees';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  Percent,
  User as UserIcon,
  Calendar,
  Eye,
  Check,
  ArrowLeft,
  Settings,
  AlertCircle,
} from 'lucide-react';
import type { IncentiveStatus } from '@/types/incentive.types';

export default function IncentivesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Filters & Pagination state
  const [page, setPage] = useState(1);
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Incentive Rule edit state (Admin only)
  const [newPercentage, setNewPercentage] = useState<string>('');
  const [ruleSuccessMsg, setRuleSuccessMsg] = useState<string | null>(null);
  const [ruleErrorMsg, setRuleErrorMsg] = useState<string | null>(null);

  const limit = 10;

  // 1. Fetch active incentive rule (Admin only)
  const { data: activeRule, isLoading: ruleLoading } = useQuery({
    queryKey: ['incentive-rule-active'],
    queryFn: () => incentivesApi.getActiveRule(),
    enabled: !!isAdmin,
  });

  // 2. Fetch Incentives list
  const { data: incentivesData, isLoading: incentivesLoading } = useQuery({
    queryKey: [
      'incentives',
      page,
      employeeFilter,
      statusFilter,
      startDate,
      endDate,
    ],
    queryFn: () =>
      incentivesApi.list({
        page,
        limit,
        employeeId: employeeFilter !== 'all' ? employeeFilter : undefined,
        status: statusFilter !== 'all' ? (statusFilter as IncentiveStatus) : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + 'T23:59:59.999Z').toISOString() : undefined,
      }),
  });

  // 3. Fetch Employees list for filter dropdown (Admin only)
  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'active-list'],
    queryFn: () => employeesApi.list({ limit: 100 }),
    enabled: !!isAdmin,
  });

  // 4. Update Rule Mutation
  const updateRuleMutation = useMutation({
    mutationFn: (percentage: number) =>
      incentivesApi.updateActiveRule({ percentage }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['incentive-rule-active'] });
      setRuleSuccessMsg(`Incentive rate updated to ${updated.percentage}% successfully`);
      setRuleErrorMsg(null);
      setNewPercentage('');
      setTimeout(() => setRuleSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setRuleErrorMsg(
        err.response?.data?.message || 'Failed to update incentive rate',
      );
      setRuleSuccessMsg(null);
    },
  });

  // 5. Mark As Paid Mutation (Admin only)
  const markAsPaidMutation = useMutation({
    mutationFn: (id: string) => incentivesApi.markAsPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentives'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to mark incentive as paid');
    },
  });

  const handleUpdateRule = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(newPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setRuleErrorMsg('Percentage must be a number between 0 and 100');
      return;
    }
    updateRuleMutation.mutate(pct);
  };

  const summary = incentivesData?.summary || {
    totalPending: 0,
    totalPaid: 0,
    totalEarned: 0,
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/dashboard')}
              title="Back to Dashboard"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {isAdmin ? 'Incentive Management' : 'My Incentives'}
              </h1>
              <p className="text-sm text-zinc-500">
                {isAdmin
                  ? 'Track, configure, and disburse employee sales commission incentives'
                  : 'View your earned commissions and payment statuses'}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center justify-between">
                <span>{isAdmin ? 'Total Pending Payout' : 'Pending Incentives'}</span>
                <Clock className="size-4 text-amber-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                ${summary.totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Awaiting administrative payout
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                <span>{isAdmin ? 'Total Disbursed' : 'Paid Incentives'}</span>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                ${summary.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Successfully disbursed to employees
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center justify-between">
                <span>{isAdmin ? 'Total Generated' : 'Total Earned'}</span>
                <DollarSign className="size-4 text-blue-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                ${summary.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Cumulative commission on approved orders
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Incentive Rate Configuration Card (ADMIN ONLY) */}
        {isAdmin && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings className="size-4 text-zinc-600 dark:text-zinc-400" />
                Active Incentive Commission Rule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateRule} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1 space-y-1">
                    <Label className="text-sm text-zinc-600 dark:text-zinc-400">
                      Current Active Rate
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                        {ruleLoading ? '...' : `${activeRule?.percentage ?? 2}%`}
                      </div>
                      <span className="text-xs text-zinc-500">
                        Applied automatically to newly approved orders
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <Label htmlFor="percentage" className="text-sm font-medium">
                      Update Commission Percentage (%)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="e.g. 2.5"
                        value={newPercentage}
                        onChange={(e) => setNewPercentage(e.target.value)}
                        className="w-full"
                      />
                      <Button
                        type="submit"
                        disabled={updateRuleMutation.isPending || !newPercentage}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {updateRuleMutation.isPending ? 'Updating...' : 'Save Rate'}
                      </Button>
                    </div>
                  </div>
                </div>

                {ruleSuccessMsg && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-md flex items-center gap-2">
                    <Check className="size-4 shrink-0" />
                    {ruleSuccessMsg}
                  </div>
                )}
                {ruleErrorMsg && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-md flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    {ruleErrorMsg}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Employee filter for Admin */}
              {isAdmin && (
                <div>
                  <Label className="text-xs text-zinc-500 mb-1 block">Employee</Label>
                  <Select
                    value={employeeFilter}
                    onValueChange={(val: string) => {
                      setEmployeeFilter(val);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {(employeesData?.items || []).map((emp) => (
                        <SelectItem key={emp._id} value={emp._id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status filter */}
              <div>
                <Label className="text-xs text-zinc-500 mb-1 block">Payment Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(val: string) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="UNPAID">Pending (Unpaid)</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div>
                <Label className="text-xs text-zinc-500 mb-1 block">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* End Date */}
              <div>
                <Label className="text-xs text-zinc-500 mb-1 block">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {(employeeFilter !== 'all' || statusFilter !== 'all' || startDate || endDate) && (
              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEmployeeFilter('all');
                    setStatusFilter('all');
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-900"
                >
                  Reset Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incentives Table */}
        <Card>
          <CardHeader className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-base font-semibold">
              Incentive Records ({incentivesData?.total || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {incentivesLoading ? (
              <div className="p-8 text-center text-zinc-500">Loading incentives...</div>
            ) : !incentivesData?.items?.length ? (
              <div className="p-12 text-center space-y-3">
                <Percent className="size-10 text-zinc-400 mx-auto" />
                <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  No incentive records found
                </p>
                <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                  Incentives are automatically generated when customer orders are approved.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3">Order Info</th>
                      {isAdmin && <th className="px-6 py-3">Employee</th>}
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3 text-right">Order Amount</th>
                      <th className="px-6 py-3 text-center">Rate</th>
                      <th className="px-6 py-3 text-right">Incentive</th>
                      <th className="px-6 py-3 text-center">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {incentivesData.items.map((inc) => (
                      <tr
                        key={inc._id}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-mono text-xs text-zinc-500">
                            #{inc.orderId?._id ? inc.orderId._id.slice(-6).toUpperCase() : 'N/A'}
                          </div>
                          <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="size-3" />
                            {inc.createdAt ? new Date(inc.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>

                        {isAdmin && (
                          <td className="px-6 py-4">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                              <UserIcon className="size-3.5 text-zinc-400" />
                              {inc.employeeId?.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-zinc-400">
                              {inc.employeeId?.email || ''}
                            </div>
                          </td>
                        )}

                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {inc.orderId?.customer?.customerName || 'N/A'}
                          </div>
                          <div className="text-xs text-zinc-400">
                            {inc.orderId?.customer?.businessName || ''}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right font-medium">
                          ${inc.orderAmount.toFixed(2)}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {inc.percentage}%
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          ${inc.incentiveAmount.toFixed(2)}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {inc.status === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <CheckCircle2 className="size-3" /> Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                              <Clock className="size-3" /> Unpaid
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right space-x-2">
                          {isAdmin && inc.status === 'UNPAID' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm(`Mark incentive of $${inc.incentiveAmount.toFixed(2)} as PAID?`)) {
                                  markAsPaidMutation.mutate(inc._id);
                                }
                              }}
                              disabled={markAsPaidMutation.isPending}
                              className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/50"
                            >
                              <Check className="size-3.5 mr-1" /> Mark Paid
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/incentives/${inc._id}`)}
                            title="View Details"
                          >
                            <Eye className="size-4 text-zinc-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination footer */}
            {incentivesData && incentivesData.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="text-xs text-zinc-500">
                  Page {incentivesData.page} of {incentivesData.totalPages} ({incentivesData.total} total)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) => Math.min(incentivesData.totalPages, p + 1))
                    }
                    disabled={page >= incentivesData.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
