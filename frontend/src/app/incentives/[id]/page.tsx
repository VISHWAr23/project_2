// User instruction: "Phase 7: Employee Incentive Management - Create frontend Incentive Details page"
// Importers/callers: Next.js App Router (/incentives/[id])
// Affected API: /api/incentives (getById, markAsPaid)
// Data schemas: Incentive, IncentiveStatus

'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { incentivesApi } from '@/lib/api/incentives';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  User as UserIcon,
  ShoppingBag,
  Building,
  CheckCircle2,
  Clock,
  Percent,
  ExternalLink,
  Check,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function IncentiveDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { data: incentive, isLoading, error } = useQuery({
    queryKey: ['incentive', resolvedParams.id],
    queryFn: () => incentivesApi.getById(resolvedParams.id),
  });

  const markAsPaidMutation = useMutation({
    mutationFn: (id: string) => incentivesApi.markAsPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentive', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['incentives'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to mark incentive as paid');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center text-zinc-500">
        Loading incentive details...
      </div>
    );
  }

  if (error || !incentive) {
    return (
      <div className="min-h-screen p-8 flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-red-500 font-semibold">Incentive not found or access denied</p>
        <Button onClick={() => router.push('/incentives')} variant="outline">
          <ArrowLeft className="size-4 mr-2" /> Back to Incentives
        </Button>
      </div>
    );
  }

  const order = incentive.orderId;
  const customer = order?.customer;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/incentives')}
              title="Back to Incentives"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Incentive #{incentive._id.slice(-6).toUpperCase()}
                </h1>
                {incentive.status === 'PAID' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <CheckCircle2 className="size-3" /> Paid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                    <Clock className="size-3" /> Unpaid
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Generated on {new Date(incentive.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {isAdmin && incentive.status === 'UNPAID' && (
            <Button
              onClick={() => {
                if (confirm(`Mark incentive of $${incentive.incentiveAmount.toFixed(2)} as PAID?`)) {
                  markAsPaidMutation.mutate(incentive._id);
                }
              }}
              disabled={markAsPaidMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Check className="size-4" /> Mark as Paid
            </Button>
          )}
        </div>

        {/* Incentive Financial Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Incentive Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                ${incentive.incentiveAmount.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-500">
                Commission Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {incentive.percentage}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-500">
                Base Order Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                ${incentive.orderAmount.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-500">
                Payment Timestamp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-1">
                {incentive.paidAt
                  ? new Date(incentive.paidAt).toLocaleDateString()
                  : 'Pending'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee & Customer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserIcon className="size-4 text-zinc-500" />
                Employee Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-zinc-500">Name:</span>{' '}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {incentive.employeeId?.name || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Email:</span>{' '}
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {incentive.employeeId?.email || 'N/A'}
                </span>
              </div>
              {incentive.employeeId?.phone && (
                <div>
                  <span className="text-zinc-500">Phone:</span>{' '}
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {incentive.employeeId.phone}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building className="size-4 text-zinc-500" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-zinc-500">Customer:</span>{' '}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {customer?.customerName || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Business:</span>{' '}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {customer?.businessName || 'N/A'}
                </span>
              </div>
              {customer?.phone && (
                <div>
                  <span className="text-zinc-500">Phone:</span>{' '}
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {customer.phone}
                  </span>
                </div>
              )}
              {customer?.address && (
                <div>
                  <span className="text-zinc-500">Address:</span>{' '}
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {customer.address}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Associated Order Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShoppingBag className="size-4 text-zinc-500" />
              Associated Order
            </CardTitle>
            {order?._id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/orders/${order._id}`)}
                className="text-xs gap-1"
              >
                <span>View Order</span>
                <ExternalLink className="size-3" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg text-xs">
              <div>
                <span className="text-zinc-500 block">Order Date</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {order?.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Order Status</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {order?.status || 'APPROVED'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Order Total</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  ${order?.totalAmount ? order.totalAmount.toFixed(2) : incentive.orderAmount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Notes</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {order?.notes || 'None'}
                </span>
              </div>
            </div>

            {order?.items && order.items.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase text-zinc-500 mb-2">
                  Line Items
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2 text-right">Quantity</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {order.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 font-medium">{item.productName}</td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-medium">${item.totalPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
