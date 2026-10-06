// User instruction: "13. Incentives (/incentives, /incentives/[id]): Commission dashboard (Summary cards: total earned, pending payout, paid, current month), Tiered commission rules display/config, Incentive list (Filter by employee, status, date range), Incentive detail (Order linkage, calculation breakdown, payout status, mark as paid action for admin)."
// Importers/callers: Next.js App Router (/incentives), AppShell, Sidebar navigation
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Receipt,
  Building2,
} from 'lucide-react';
import type { IncentiveStatus } from '@/types/incentive.types';
import { formatDate } from '@/lib/format';

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

  // Mark Paid confirmation state
  const [payingIncentive, setPayingIncentive] = useState<{ id: string; amount: number } | null>(null);

  const limit = 10;

  // 1. Fetch active incentive rule (Admin only)
  const { data: activeRule, isLoading: ruleLoading } = useQuery({
    queryKey: ['incentive-rule-active'],
    queryFn: () => incentivesApi.getActiveRule(),
    enabled: !!user && !!isAdmin,
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
    enabled: !!user,
  });

  // 3. Fetch Employees list for filter dropdown (Admin only)
  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'active-list'],
    queryFn: () => employeesApi.list({ limit: 100 }),
    enabled: !!user && !!isAdmin,
  });

  // 4. Update Rule Mutation
  const updateRuleMutation = useMutation({
    mutationFn: (percentage: number) =>
      incentivesApi.updateActiveRule({ percentage }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['incentive-rule-active'] });
      setRuleSuccessMsg(`Incentive commission rate updated to ${updated.percentage}% successfully`);
      setRuleErrorMsg(null);
      setNewPercentage('');
      setTimeout(() => setRuleSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setRuleErrorMsg(
        err.response?.data?.message || 'Failed to update commission rate'
      );
      setRuleSuccessMsg(null);
    },
  });

  // 5. Mark As Paid Mutation (Admin only)
  const markAsPaidMutation = useMutation({
    mutationFn: (id: string) => incentivesApi.markAsPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentives'] });
      setPayingIncentive(null);
    },
    onError: (err: any) => {
      setRuleErrorMsg(err.response?.data?.message || 'Failed to mark incentive as paid');
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

  const hasActiveFilters =
    employeeFilter !== 'all' || statusFilter !== 'all' || !!startDate || !!endDate;

  const handleResetFilters = () => {
    setEmployeeFilter('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={isAdmin ? 'Commission & Incentive Ledger' : 'My Commission Incentives'}
        subtitle={
          isAdmin
            ? 'Audit, configure commission benchmarks, and disburse sales performance payouts'
            : 'Track earned commercial commission incentives and disbursement status'
        }
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/orders')}
            className="gap-1.5 text-xs text-foreground"
          >
            <Receipt className="size-3.5 text-primary" />
            <span>Commercial Orders</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['incentives'] })}
            className="gap-1.5 text-xs text-foreground"
          >
            <RefreshCw className="size-3.5 text-muted-foreground" />
            <span>Refresh</span>
          </Button>
        </div>
      </PageHeader>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={isAdmin ? 'Pending Payout Volume' : 'Pending Incentives'}
          value={<CurrencyDisplay amount={summary.totalPending} />}
          description="Awaiting administrative disbursement"
          icon={Clock}
          variant="warning"
        />

        <StatCard
          title={isAdmin ? 'Total Disbursed' : 'Paid Commissions'}
          value={<CurrencyDisplay amount={summary.totalPaid} />}
          description="Successfully transferred to representatives"
          icon={CheckCircle2}
          variant="success"
        />

        <StatCard
          title={isAdmin ? 'Cumulative Generated' : 'Total Earned'}
          value={<CurrencyDisplay amount={summary.totalEarned} />}
          description="Total commission on approved orders"
          icon={TrendingUp}
          variant="primary"
        />
      </div>

      {/* Admin Commission Rate Configuration Card */}
      {isAdmin && (
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Settings className="size-3.5 text-primary" />
              Active Sales Commission Rule
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Applied automatically when purchase orders are approved
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleUpdateRule} className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Active Benchmark Rate</Label>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-md bg-background border border-primary/30 font-mono font-bold text-primary text-base">
                      {ruleLoading ? '...' : `${activeRule?.percentage ?? 2}%`}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      of gross approved order total
                    </span>
                  </div>
                </div>

                <div className="flex-1 max-w-md space-y-1">
                  <Label htmlFor="percentage" className="text-[11px] text-muted-foreground font-medium">
                    Adjust Global Commission Percentage (%)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="e.g. 3.5"
                      value={newPercentage}
                      onChange={(e) => setNewPercentage(e.target.value)}
                      className="h-8 text-xs bg-background border-border font-mono"
                    />
                    <Button
                      type="submit"
                      disabled={updateRuleMutation.isPending || !newPercentage}
                      className="h-8 px-3 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                    >
                      {updateRuleMutation.isPending ? 'Updating...' : 'Save Rate'}
                    </Button>
                  </div>
                </div>
              </div>

              {ruleSuccessMsg && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-md flex items-center gap-2">
                  <Check className="size-3.5 shrink-0" />
                  <span>{ruleSuccessMsg}</span>
                </div>
              )}
              {ruleErrorMsg && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-md flex items-center gap-2">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{ruleErrorMsg}</span>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter Toolbar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Employee filter (Admin only) */}
            {isAdmin && (
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Field Representative</Label>
                <Select
                  value={employeeFilter}
                  onValueChange={(val: string) => {
                    setEmployeeFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-background border-border">
                    <SelectValue placeholder="All Representatives" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All Representatives</SelectItem>
                    {(employeesData?.items || []).map((emp) => (
                      <SelectItem key={emp._id} value={emp._id}>
                        {emp.name} ({(emp as { designation?: string }).designation || 'Sales Rep'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status filter */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Disbursement Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(val: string) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-background border-border">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="UNPAID">Pending (Unpaid)</SelectItem>
                  <SelectItem value="PAID">Disbursed (Paid)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs bg-background border-border font-mono"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs bg-background border-border font-mono"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
              >
                Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incentives Ledger Table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Percent className="size-3.5 text-primary" />
              Incentive Ledger Records ({incentivesData?.total || 0})
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Performance commissions linked to approved commercial contracts
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {incentivesLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-2">
              <Percent className="size-6 animate-pulse text-primary" />
              <p className="text-xs text-muted-foreground">Loading commission records...</p>
            </div>
          ) : !incentivesData?.items?.length ? (
            <div className="p-8">
              <EmptyState
                icon={Percent}
                title="No Incentive Records"
                description={
                  hasActiveFilters
                    ? 'No incentive records match the active criteria. Try adjusting your filters.'
                    : 'Sales incentives will be generated automatically when orders are approved.'
                }
                action={
                  hasActiveFilters
                    ? {
                        label: 'Clear Filters',
                        onClick: handleResetFilters,
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Order Ref</th>
                    {isAdmin && <th className="py-3 px-3">Sales Rep</th>}
                    <th className="py-3 px-3">Customer Account</th>
                    <th className="py-3 px-3 text-right">Order Gross</th>
                    <th className="py-3 px-3 text-center">Rate</th>
                    <th className="py-3 px-3 text-right">Incentive</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {incentivesData.items.map((inc) => (
                    <tr key={inc._id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-foreground">
                          #{inc.orderId?._id ? inc.orderId._id.slice(-6).toUpperCase() : 'N/A'}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="size-3 text-muted-foreground/60" />
                          <span>{formatDate(inc.createdAt)}</span>
                        </div>
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-3">
                          <div className="font-semibold text-foreground font-heading flex items-center gap-1.5">
                            <UserIcon className="size-3 text-primary" />
                            <span>{inc.employeeId?.name || 'Unknown'}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {inc.employeeId?.email || ''}
                          </div>
                        </td>
                      )}

                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground font-heading">
                          {inc.orderId?.customer?.customerName || inc.orderId?.customer?.businessName || 'N/A'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {inc.orderId?.customer?.businessName || ''}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-muted-foreground font-medium">
                        <CurrencyDisplay amount={inc.orderAmount || 0} />
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono bg-primary/10 text-primary border border-primary/20">
                          {inc.percentage}%
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 text-xs">
                        <CurrencyDisplay amount={inc.incentiveAmount || 0} />
                      </td>

                      <td className="py-3 px-3 text-center">
                        <StatusBadge status={inc.status} />
                      </td>

                      <td className="py-3 px-4 text-right space-x-1.5">
                        {isAdmin && inc.status === 'UNPAID' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setPayingIncentive({
                                id: inc._id,
                                amount: inc.incentiveAmount,
                              })
                            }
                            className="h-7 px-2 text-[11px] text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 gap-1 font-medium"
                          >
                            <Check className="size-3" />
                            <span>Disburse</span>
                          </Button>
                        )}
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => router.push(`/incentives/${inc._id}`)}
                          className="size-7 text-muted-foreground hover:text-foreground"
                          title="View Incentive Details"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {incentivesData && incentivesData.totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Page <span className="font-mono font-medium text-foreground">{incentivesData.page}</span> of{' '}
                <span className="font-mono font-medium text-foreground">{incentivesData.totalPages}</span> (
                {incentivesData.total} records)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 gap-1 text-xs text-foreground"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(incentivesData.totalPages, p + 1))}
                  disabled={page >= incentivesData.totalPages}
                  className="h-8 gap-1 text-xs text-foreground"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog: Mark Incentive as Paid */}
      <AlertDialog
        open={!!payingIncentive}
        onOpenChange={(open: boolean) => !open && setPayingIncentive(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-heading">
              Confirm Commission Disbursement
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to mark this incentive payout of{' '}
              <span className="font-mono font-bold text-emerald-400">
                ₹{Number(payingIncentive?.amount || 0).toLocaleString()}
              </span>{' '}
              as PAID? This will record the disbursement timestamp in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (payingIncentive?.id) {
                  markAsPaidMutation.mutate(payingIncentive.id);
                }
              }}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {markAsPaidMutation.isPending ? 'Processing...' : 'Confirm Paid'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
