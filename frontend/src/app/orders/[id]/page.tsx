// User instruction: "12. Orders (/orders, /orders/[id]): Order creation (Select customer, add products from catalog with quantity/price/discounts, tax calculation, total computation, notes), Order list (Search, filter by status/date/customer/sales rep, sorting, status badges, pagination), Order detail (Full order breakdown, line items table, customer & sales rep info, status update workflow [Draft -> Submitted -> Approved -> In Production -> Shipped -> Delivered / Cancelled], order timeline/audit history, PDF invoice generation/download simulator)."
// Importers/callers: Next.js App Router (/orders/[id]), AppShell, Sidebar navigation
// Affected API: /api/orders/:id (getById, update, approve, reject, complete, cancel), /api/incentives
// Data schemas: Order, OrderItem, OrderStatus, UpdateOrderPayload, RejectOrderPayload, Incentive

'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ordersApi } from '@/lib/api/orders';
import { incentivesApi } from '@/lib/api/incentives';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Edit2,
  Building2,
  User as UserIcon,
  Calendar,
  Receipt,
  ShoppingCart,
  Trash2,
  Plus,
  AlertCircle,
  FileText,
  Percent,
  Download,
  Printer,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  PackageCheck,
  Truck,
  Check,
} from 'lucide-react';
import type { OrderStatus, CreateOrderItemPayload } from '@/types/order.types';
import { formatDate } from '@/lib/format';

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Action dialog states
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Edit order form state
  const [editItems, setEditItems] = useState<CreateOrderItemPayload[]>([]);
  const [editOrderDate, setEditOrderDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Order query
  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['order', resolvedParams.id],
    queryFn: () => ordersApi.getById(resolvedParams.id),
    enabled: !!user && !!resolvedParams.id,
    staleTime: 5000,
  });

  // 1.1 Fetch Associated Incentive (for APPROVED or COMPLETED orders)
  const { data: incentive } = useQuery({
    queryKey: ['order-incentive', resolvedParams.id],
    queryFn: () => incentivesApi.getByOrderId(resolvedParams.id),
    enabled: !!user && (order?.status === 'APPROVED' || order?.status === 'COMPLETED'),
  });

  // Helper for opening edit modal with current order values
  const openEditModal = () => {
    if (!order) return;
    setEditItems(
      order.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }))
    );
    setEditOrderDate(
      order.orderDate
        ? new Date(order.orderDate).toISOString().split('T')[0]
        : ''
    );
    setEditNotes(order.notes || '');
    setActionError(null);
    setEditModalOpen(true);
  };

  // Line item helpers for edit
  const handleAddEditItem = () => {
    setEditItems((prev) => [...prev, { productName: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveEditItem = (index: number) => {
    if (editItems.length <= 1) return;
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditItemChange = (
    index: number,
    field: keyof CreateOrderItemPayload,
    value: any
  ) => {
    setEditItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const calculatedEditTotal = editItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return Math.round((sum + qty * price) * 100) / 100;
  }, 0);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: () => ordersApi.approve(resolvedParams.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setConfirmApproveOpen(false);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to approve order');
      setConfirmApproveOpen(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      ordersApi.reject(resolvedParams.id, { reason: rejectReason.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setRejectModalOpen(false);
      setRejectReason('');
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to reject order');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => ordersApi.complete(resolvedParams.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setConfirmCompleteOpen(false);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to complete order');
      setConfirmCompleteOpen(false);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(resolvedParams.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setConfirmCancelOpen(false);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to cancel order');
      setConfirmCancelOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editItems || editItems.length === 0) {
        throw new Error('Please add at least one item');
      }
      for (const item of editItems) {
        if (!item.productName.trim()) {
          throw new Error('Product name is required for all items');
        }
        if (Number(item.quantity) <= 0) {
          throw new Error('Quantity must be greater than 0');
        }
        if (Number(item.unitPrice) < 0) {
          throw new Error('Unit price cannot be negative');
        }
      }

      return ordersApi.update(resolvedParams.id, {
        orderDate: editOrderDate ? new Date(editOrderDate).toISOString() : undefined,
        items: editItems.map((it) => ({
          productName: it.productName.trim(),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
        notes: editNotes.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setEditModalOpen(false);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to update order');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
        <Receipt className="size-8 animate-pulse text-primary" />
        <p className="font-semibold text-foreground text-sm">Loading purchase order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push('/orders')} className="gap-1.5 text-xs">
          <ArrowLeft className="size-3.5" /> Back to Orders
        </Button>
        <EmptyState
          icon={ShoppingCart}
          title="Order Record Not Found"
          description="The requested order record does not exist or you do not have permission to view it."
          action={{
            label: 'Return to Orders',
            onClick: () => router.push('/orders'),
          }}
        />
      </div>
    );
  }

  const isOwnOrder = user?._id === (order.employee?._id || (order.employee as any));
  const customerName =
    typeof order.customer === 'object'
      ? order.customer?.customerName || order.customer?.businessName || 'Customer Account'
      : 'Customer Account';
  const businessName =
    typeof order.customer === 'object'
      ? order.customer?.businessName || ''
      : '';
  const customerPhone = typeof order.customer === 'object' ? order.customer?.phone : '';
  const customerAddress = typeof order.customer === 'object' ? order.customer?.address : '';
  const employeeName = typeof order.employee === 'object' ? order.employee?.name : 'Representative';
  const employeeEmail = typeof order.employee === 'object' ? order.employee?.email : '';
  const employeePhone = typeof order.employee === 'object' ? order.employee?.phone : '';

  // Order workflow steps visualizer
  const workflowSteps = [
    { label: 'Drafted', key: 'draft', done: true },
    { label: 'Pending Review', key: 'pending', done: true },
    {
      label: order.status === 'REJECTED' ? 'Rejected' : order.status === 'CANCELLED' ? 'Cancelled' : 'Approved',
      key: 'approval',
      done: ['APPROVED', 'COMPLETED'].includes(order.status),
      failed: ['REJECTED', 'CANCELLED'].includes(order.status),
    },
    {
      label: 'Delivered & Completed',
      key: 'completed',
      done: order.status === 'COMPLETED',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Purchase Order #${order._id.slice(-6).toUpperCase()}`}
        subtitle={`Placed on ${formatDate(order.orderDate || order.createdAt)} for ${customerName}`}
      >
        <div className="flex items-center flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/orders')}
            className="gap-1.5 text-xs text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Orders List</span>
          </Button>

          {/* Simulated PDF / Print Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs text-foreground hidden sm:flex"
          >
            <Printer className="size-3.5 text-primary" />
            <span>Print Invoice</span>
          </Button>

          {/* ADMIN WORKFLOW ACTIONS: PENDING */}
          {isAdmin && order.status === 'PENDING' && (
            <>
              <Button
                size="sm"
                onClick={() => setConfirmApproveOpen(true)}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                <CheckCircle2 className="size-3.5" />
                <span>Approve Order</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRejectReason('');
                  setRejectModalOpen(true);
                }}
                className="gap-1.5 text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
              >
                <XCircle className="size-3.5" />
                <span>Reject</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmCancelOpen(true)}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Ban className="size-3.5" />
                <span>Cancel</span>
              </Button>
            </>
          )}

          {/* ADMIN WORKFLOW ACTIONS: APPROVED */}
          {isAdmin && order.status === 'APPROVED' && (
            <>
              <Button
                size="sm"
                onClick={() => setConfirmCompleteOpen(true)}
                className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                <PackageCheck className="size-3.5" />
                <span>Mark Completed</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmCancelOpen(true)}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Ban className="size-3.5" />
                <span>Cancel</span>
              </Button>
            </>
          )}

          {/* EMPLOYEE WORKFLOW ACTIONS: PENDING */}
          {!isAdmin && isOwnOrder && order.status === 'PENDING' && (
            <>
              <Button
                size="sm"
                onClick={openEditModal}
                className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                <Edit2 className="size-3.5" />
                <span>Edit Order</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmCancelOpen(true)}
                className="gap-1.5 text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
              >
                <Ban className="size-3.5" />
                <span>Cancel Order</span>
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      {/* Global Error Banner */}
      {actionError && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Workflow Progress Stepper */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {workflowSteps.map((st, idx) => (
              <div key={st.key} className="flex items-center gap-2 min-w-max flex-1">
                <div
                  className={`size-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    st.failed
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : st.done
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-muted/40 text-muted-foreground border border-border'
                  }`}
                >
                  {st.failed ? <XCircle className="size-3.5" /> : st.done ? <Check className="size-3.5" /> : idx + 1}
                </div>
                <div className="space-y-0.5">
                  <div
                    className={`text-xs font-semibold ${
                      st.failed
                        ? 'text-rose-400'
                        : st.done
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {st.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {idx === 0
                      ? 'Client selected'
                      : idx === 1
                      ? 'Awaiting sign-off'
                      : idx === 2
                      ? 'Commercial authorization'
                      : 'Order finalized'}
                  </div>
                </div>
                {idx < workflowSteps.length - 1 && (
                  <div className="h-0.5 flex-1 bg-border/80 mx-2 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Primary 3-Column Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer Details */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Building2 className="size-3.5 text-primary" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div>
              <p className="font-semibold text-foreground font-heading">{customerName}</p>
              {businessName && (
                <p className="text-[11px] text-muted-foreground font-mono">{businessName}</p>
              )}
            </div>
            {customerPhone && (
              <div className="text-[11px] text-muted-foreground">
                <span className="text-foreground font-medium">Contact:</span> {customerPhone}
              </div>
            )}
            {customerAddress && (
              <div className="text-[11px] text-muted-foreground">
                <span className="text-foreground font-medium">Billing Address:</span> {customerAddress}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Representative */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <UserIcon className="size-3.5 text-primary" />
              Sales Representative
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div>
              <p className="font-semibold text-foreground font-heading">{employeeName}</p>
              {employeeEmail && (
                <p className="text-[11px] text-muted-foreground">{employeeEmail}</p>
              )}
            </div>
            {employeePhone && (
              <div className="text-[11px] text-muted-foreground">
                <span className="text-foreground font-medium">Phone:</span> {employeePhone}
              </div>
            )}
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
              <span className="text-foreground font-medium">Account Owner:</span> Territory Lead
            </div>
          </CardContent>
        </Card>

        {/* Lifecycle & Status Audit */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-primary" />
                Lifecycle Audit
              </span>
              <StatusBadge status={order.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div>
              <p className="text-[11px] text-muted-foreground">Internal Order ID</p>
              <p className="font-mono font-bold text-foreground text-xs">{order._id}</p>
            </div>
            {order.approvedBy && (
              <div className="text-[11px] border-t border-border/40 pt-1.5 space-y-0.5">
                <p className="text-muted-foreground">
                  <span className="text-foreground font-medium">Authorized By:</span>{' '}
                  {order.approvedBy.name}
                </p>
                {order.approvedAt && (
                  <p className="text-muted-foreground font-mono">
                    {new Date(order.approvedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
            {order.rejectionReason && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mt-1">
                <p className="font-semibold">Rejection Note:</p>
                <p className="italic">"{order.rejectionReason}"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Commission Incentive Card (for Approved/Completed orders) */}
      {(order.status === 'APPROVED' || order.status === 'COMPLETED') && incentive && (
        <Card className="bg-emerald-500/5 border border-emerald-500/20">
          <CardHeader className="p-4 pb-2 border-b border-emerald-500/20 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
              <Percent className="size-3.5" />
              Automated Sales Commission Incentive
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/incentives/${incentive._id}`)}
              className="text-xs h-7 gap-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
            >
              <span>View Incentive Record</span>
              <ExternalLink className="size-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-muted-foreground block">Commission Tier</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  {incentive.percentage}%
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Computed Incentive</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  <CurrencyDisplay amount={incentive.incentiveAmount} />
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Payout Status</span>
                <span className="mt-0.5 inline-block">
                  <StatusBadge status={incentive.status} />
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Beneficiary</span>
                <span className="font-semibold text-foreground font-heading">
                  {incentive.employeeId?.name || employeeName}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Items Table Card */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="size-3.5 text-primary" />
              Commercial Line Items Breakdown
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
              Verified SKU units, contract price benchmarks, and subtotal computations
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-muted-foreground block">Gross Amount</span>
            <span className="text-lg font-bold font-mono text-primary">
              <CurrencyDisplay amount={order.totalAmount || 0} />
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-3">Product Description / SKU</th>
                  <th className="py-3 px-3 text-center">Quantity</th>
                  <th className="py-3 px-3 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {order.items.map((item, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground font-mono">{index + 1}</td>
                    <td className="py-3 px-3 font-semibold text-foreground font-heading">
                      {item.productName}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium text-foreground">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                      <CurrencyDisplay amount={item.unitPrice || 0} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                      <CurrencyDisplay amount={item.totalPrice || 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/20 border-t border-border font-semibold text-xs">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right text-muted-foreground">
                    Grand Total Payable:
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-base font-bold text-primary">
                    <CurrencyDisplay amount={order.totalAmount || 0} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes / Special Instructions Card */}
      {order.notes && (
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <FileText className="size-3.5 text-primary" />
              Delivery Notes & Fulfillment Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed">
            {order.notes}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog: Approve */}
      <AlertDialog open={confirmApproveOpen} onOpenChange={setConfirmApproveOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-heading">
              Approve Commercial Order?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to approve this order for{' '}
              <span className="font-mono font-bold text-primary">
                ₹{Number(order.totalAmount || 0).toLocaleString()}
              </span>
              ? Once approved, the order status will change to APPROVED and commission incentives will be generated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveMutation.mutate()}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Dialog with Reason input */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading flex items-center gap-2 text-rose-400">
              <XCircle className="size-4" />
              Reject Purchase Order
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please specify the audit reason for rejecting this order. The field sales representative will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-1">
            <Label className="text-xs text-foreground">Rejection Reason</Label>
            <Input
              placeholder="e.g. Credit limit exceeded / Invalid product specifications"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-xs bg-background border-border mt-1"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
              className="text-xs text-foreground"
            >
              Cancel
            </Button>
            <Button
              disabled={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate()}
              className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Complete */}
      <AlertDialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-heading">
              Mark Order as Completed?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              This will transition the order from APPROVED to COMPLETED and verify final product delivery to the client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => completeMutation.mutate()}
              className="text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              {completeMutation.isPending ? 'Completing...' : 'Mark Completed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog: Cancel */}
      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-heading text-rose-400">
              Cancel Purchase Order?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to cancel this order? Cancelled orders cannot be reopened or edited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs text-foreground">Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate()}
              className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Order Dialog (for PENDING orders) */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading flex items-center gap-2">
              <Edit2 className="size-4 text-primary" />
              Edit Pending Order
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify line items, quantities, pricing, and commercial instructions for this order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs text-foreground">Order Date</Label>
              <Input
                type="date"
                value={editOrderDate}
                onChange={(e) => setEditOrderDate(e.target.value)}
                className="mt-1 h-8 text-xs bg-background border-border font-mono"
              />
            </div>

            {/* Line Items */}
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Order Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddEditItem}
                  className="gap-1 text-xs text-foreground font-medium"
                >
                  <Plus className="size-3 text-primary" /> Add Product
                </Button>
              </div>

              <div className="space-y-2">
                {editItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 p-3 bg-background rounded-lg border border-border items-end"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <Label className="text-[11px] text-muted-foreground">Product Description *</Label>
                      <Input
                        placeholder="Product SKU"
                        value={item.productName}
                        onChange={(e) =>
                          handleEditItemChange(idx, 'productName', e.target.value)
                        }
                        className="mt-1 h-8 text-xs bg-card border-border"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-[11px] text-muted-foreground">Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleEditItemChange(idx, 'quantity', e.target.value)
                        }
                        className="mt-1 h-8 text-xs bg-card border-border font-mono"
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-3">
                      <Label className="text-[11px] text-muted-foreground">Unit Price (₹) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleEditItemChange(idx, 'unitPrice', e.target.value)
                        }
                        className="mt-1 h-8 text-xs bg-card border-border font-mono"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-2 pb-0.5">
                      <div className="text-right font-mono font-semibold text-foreground text-xs hidden sm:block">
                        <CurrencyDisplay
                          amount={(Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={editItems.length <= 1}
                        onClick={() => handleRemoveEditItem(idx)}
                        className="size-8 text-muted-foreground hover:text-rose-400"
                        title="Remove item"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Calculated Total */}
              <div className="p-3 bg-muted/30 rounded-lg border border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">
                  Updated Order Total:
                </span>
                <span className="text-base font-bold font-mono text-primary">
                  <CurrencyDisplay amount={calculatedEditTotal} />
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t border-border pt-3">
              <Label className="text-xs text-foreground">Delivery & Commercial Notes</Label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Shipping instructions, PO number..."
                className="mt-1 h-8 text-xs bg-background border-border"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              className="text-xs text-foreground"
            >
              Cancel
            </Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
              className="text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
