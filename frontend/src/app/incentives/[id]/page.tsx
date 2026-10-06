// User instruction: "13. Incentives (/incentives, /incentives/[id]): Commission dashboard (Summary cards: total earned, pending payout, paid, current month), Tiered commission rules display/config, Incentive list (Filter by employee, status, date range), Incentive detail (Order linkage, calculation breakdown, payout status, mark as paid action for admin)."
// Importers/callers: Next.js App Router (/incentives/[id]), AppShell, Incentives list
// Affected API: /api/incentives (getById, markAsPaid)
// Data schemas: Incentive, IncentiveStatus, Order, OrderItem, Customer, Employee

'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { incentivesApi } from '@/lib/api/incentives';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { StatCard } from '@/components/ui/stat-card';
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
  ArrowLeft,
  DollarSign,
  Calendar,
  User as UserIcon,
  ShoppingBag,
  Building2,
  CheckCircle2,
  Clock,
  Percent,
  ExternalLink,
  Check,
  Receipt,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { formatDate } from '@/lib/format';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function IncentiveDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [confirmPaidOpen, setConfirmPaidOpen] = useState(false);

  const { data: incentive, isLoading, error } = useQuery({
    queryKey: ['incentive', resolvedParams.id],
    queryFn: () => incentivesApi.getById(resolvedParams.id),
    enabled: !!user && !!resolvedParams.id,
  });

  const markAsPaidMutation = useMutation({
    mutationFn: (id: string) => incentivesApi.markAsPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentive', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['incentives'] });
      setConfirmPaidOpen(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to mark incentive as paid');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center space-y-2">
        <Percent className="size-8 animate-pulse text-primary" />
        <p className="text-xs text-muted-foreground">Loading commission details...</p>
      </div>
    );
  }

  if (error || !incentive) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center space-y-4">
        <p className="text-sm font-semibold text-rose-400">Incentive record not found or access denied</p>
        <Button onClick={() => router.push('/incentives')} variant="outline" size="sm" className="text-foreground">
          <ArrowLeft className="size-4 mr-2" /> Back to Incentives Ledger
        </Button>
      </div>
    );
  }

  const order = incentive.orderId;
  const customer = order?.customer;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title={`Incentive #${incentive._id.slice(-6).toUpperCase()}`}
        subtitle={`Generated on ${formatDate(incentive.createdAt)} · Linked to Order #${order?._id ? order._id.slice(-6).toUpperCase() : 'N/A'}`}
        backButton={{
          label: 'Incentives',
          onClick: () => router.push('/incentives'),
        }}
      >
        <div className="flex items-center gap-3">
          <StatusBadge status={incentive.status} />
          {isAdmin && incentive.status === 'UNPAID' && (
            <Button
              onClick={() => setConfirmPaidOpen(true)}
              disabled={markAsPaidMutation.isPending}
              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5 shadow-sm"
            >
              <Check className="size-3.5" />
              <span>Mark as Disbursed</span>
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Financial Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Commission Payout"
          value={<CurrencyDisplay amount={incentive.incentiveAmount} />}
          description={`${incentive.percentage}% commission share`}
          icon={TrendingUp}
          variant="success"
        />

        <StatCard
          title="Commission Benchmark"
          value={`${incentive.percentage}%`}
          description="Active percentage rule"
          icon={Percent}
          variant="primary"
        />

        <StatCard
          title="Base Order Amount"
          value={<CurrencyDisplay amount={incentive.orderAmount} />}
          description="Gross approved contract value"
          icon={Receipt}
          variant="default"
        />

        <StatCard
          title="Disbursement Status"
          value={incentive.status === 'PAID' ? 'Disbursed' : 'Pending'}
          description={
            incentive.paidAt
              ? `Paid on ${formatDate(incentive.paidAt)}`
              : 'Awaiting admin transfer'
          }
          icon={incentive.status === 'PAID' ? CheckCircle2 : Clock}
          variant={incentive.status === 'PAID' ? 'success' : 'warning'}
        />
      </div>

      {/* Employee & Customer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sales Representative Card */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <UserIcon className="size-3.5 text-primary" />
              Field Representative
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-semibold text-foreground font-heading">
                {incentive.employeeId?.name || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-mono text-foreground flex items-center gap-1">
                <Mail className="size-3 text-muted-foreground" />
                {incentive.employeeId?.email || 'N/A'}
              </span>
            </div>
            {incentive.employeeId?.phone && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-mono text-foreground flex items-center gap-1">
                  <Phone className="size-3 text-muted-foreground" />
                  {incentive.employeeId.phone}
                </span>
              </div>
            )}
            {(incentive.employeeId as { designation?: string })?.designation && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Designation</span>
                <span className="text-foreground">
                  {(incentive.employeeId as { designation?: string }).designation}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Account Card */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Building2 className="size-3.5 text-primary" />
              Customer Account
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Contact Name</span>
              <span className="font-semibold text-foreground font-heading">
                {customer?.customerName || customer?.businessName || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Business Entity</span>
              <span className="font-medium text-foreground">
                {customer?.businessName || 'N/A'}
              </span>
            </div>
            {customer?.phone && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-mono text-foreground flex items-center gap-1">
                  <Phone className="size-3 text-muted-foreground" />
                  {customer.phone}
                </span>
              </div>
            )}
            {customer?.address && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Address</span>
                <span className="text-foreground text-right">
                  {customer.address}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Associated Order Card */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <ShoppingBag className="size-3.5 text-primary" />
              Associated Commercial Order
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Underlying sales agreement from which this commission was calculated
            </CardDescription>
          </div>
          {order?._id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/orders/${order._id}`)}
              className="h-7 text-xs gap-1.5 text-foreground"
            >
              <span>View Full Order</span>
              <ExternalLink className="size-3 text-muted-foreground" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/20 border border-border/60 rounded-md text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Order Ref</span>
              <span className="font-mono font-bold text-foreground">
                #{order?._id ? order._id.slice(-6).toUpperCase() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Order Status</span>
              <span className="mt-0.5 inline-block">
                <StatusBadge status={order?.status || 'APPROVED'} />
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Order Total</span>
              <span className="font-mono font-bold text-foreground">
                <CurrencyDisplay amount={order?.totalAmount || incentive.orderAmount} />
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Order Date</span>
              <span className="text-foreground">
                {order?.orderDate ? formatDate(order.orderDate) : formatDate(incentive.createdAt)}
              </span>
            </div>
          </div>

          {order?.items && order.items.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">
                Line Items ({order.items.length})
              </h4>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="px-3 py-2">Product Description</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {order.items.map((item, index) => (
                      <tr key={index} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium text-foreground">{item.productName}</td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">{item.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                          <CurrencyDisplay amount={item.unitPrice} />
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                          <CurrencyDisplay amount={item.totalPrice} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog: Mark Incentive as Paid */}
      <AlertDialog
        open={confirmPaidOpen}
        onOpenChange={setConfirmPaidOpen}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-heading">
              Confirm Commission Disbursement
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to mark this commission payout of{' '}
              <span className="font-mono font-bold text-emerald-400">
                ₹{Number(incentive.incentiveAmount || 0).toLocaleString()}
              </span>{' '}
              for <strong className="text-foreground">{incentive.employeeId?.name || 'Sales Rep'}</strong> as PAID?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => markAsPaidMutation.mutate(incentive._id)}
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
