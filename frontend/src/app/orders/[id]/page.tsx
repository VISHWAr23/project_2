// User instruction: "Phase 6: Order Management - Create frontend Order Detail UI"
// Importers/callers: Next.js App Router (/orders/[id])
// Affected API: /api/orders/:id (getById, update, approve, reject, complete, cancel)
// Data schemas: Order, OrderItem, OrderStatus, UpdateOrderPayload, RejectOrderPayload

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
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Edit2,
  Building,
  User,
  Calendar,
  DollarSign,
  ShoppingCart,
  Trash2,
  Plus,
  AlertCircle,
  FileText,
  Percent,
  CheckCircle2,
} from 'lucide-react';
import type { OrderStatus, CreateOrderItemPayload } from '@/types/order.types';

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
    staleTime: 5000,
  });

  // 1.1 Fetch Associated Incentive (for APPROVED or COMPLETED orders)
  const { data: incentive } = useQuery({
    queryKey: ['order-incentive', resolvedParams.id],
    queryFn: () => incentivesApi.getByOrderId(resolvedParams.id),
    enabled: order?.status === 'APPROVED' || order?.status === 'COMPLETED',
  });

  // Helper for opening edit modal with current order values
  const openEditModal = () => {
    if (!order) return;
    setEditItems(
      order.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    );
    setEditOrderDate(
      order.orderDate
        ? new Date(order.orderDate).toISOString().split('T')[0]
        : '',
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
    value: any,
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

  // Status badge renderer
  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
            <Clock className="size-3.5" /> Pending Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
            <CheckCircle className="size-3.5" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
            <XCircle className="size-3.5" /> Rejected
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
            <CheckCircle className="size-3.5" /> Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            <Ban className="size-3.5" /> Cancelled
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 flex items-center justify-center">
        <p className="text-zinc-500">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 max-w-4xl mx-auto space-y-4">
        <Button variant="outline" onClick={() => router.push('/orders')} className="gap-1.5">
          <ArrowLeft className="size-4" /> Back to Orders
        </Button>
        <Card className="border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="p-6 text-rose-700 dark:text-rose-300">
            Order not found or you do not have permission to view this order.
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwnOrder =
    user?._id === (order.employee?._id || (order.employee as any));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/orders')}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" /> Orders List
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Order Details
                </h1>
                {renderStatusBadge(order.status)}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                ID: {order._id} • Placed on {new Date(order.orderDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Workflow Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {/* ADMIN ACTIONS: PENDING */}
            {isAdmin && order.status === 'PENDING' && (
              <>
                <Button
                  size="sm"
                  onClick={() => setConfirmApproveOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  <CheckCircle className="size-4" /> Approve Order
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRejectReason('');
                    setRejectModalOpen(true);
                  }}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/50 gap-1.5"
                >
                  <XCircle className="size-4" /> Reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmCancelOpen(true)}
                  className="text-zinc-600 hover:text-zinc-800 gap-1.5"
                >
                  <Ban className="size-4" /> Cancel
                </Button>
              </>
            )}

            {/* ADMIN ACTIONS: APPROVED */}
            {isAdmin && order.status === 'APPROVED' && (
              <>
                <Button
                  size="sm"
                  onClick={() => setConfirmCompleteOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <CheckCircle className="size-4" /> Mark Completed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmCancelOpen(true)}
                  className="text-zinc-600 hover:text-zinc-800 gap-1.5"
                >
                  <Ban className="size-4" /> Cancel
                </Button>
              </>
            )}

            {/* EMPLOYEE ACTIONS: PENDING */}
            {!isAdmin && isOwnOrder && order.status === 'PENDING' && (
              <>
                <Button
                  size="sm"
                  onClick={openEditModal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <Edit2 className="size-4" /> Edit Order
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmCancelOpen(true)}
                  className="text-zinc-600 hover:text-zinc-800 gap-1.5"
                >
                  <Ban className="size-4" /> Cancel Order
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Global Action Error Alert */}
        {actionError && (
          <div className="p-4 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Summary Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building className="size-4 text-emerald-600" /> Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1.5">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {order.customer?.customerName || 'N/A'}
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                {order.customer?.businessName}
              </p>
              {order.customer?.phone && (
                <p className="text-xs text-zinc-500">Phone: {order.customer.phone}</p>
              )}
              {order.customer?.address && (
                <p className="text-xs text-zinc-500">Address: {order.customer.address}</p>
              )}
            </CardContent>
          </Card>

          {/* Assigned Employee Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="size-4 text-blue-600" /> Sales Representative
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1.5">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {order.employee?.name || 'Unassigned'}
              </p>
              <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                {order.employee?.email}
              </p>
              {order.employee?.phone && (
                <p className="text-xs text-zinc-500">Phone: {order.employee.phone}</p>
              )}
            </CardContent>
          </Card>

          {/* Status & Review Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="size-4 text-amber-600" /> Lifecycle Status
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <p className="text-xs text-zinc-500">Current Status</p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {order.status}
                </p>
              </div>
              {order.approvedBy && (
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-1.5 text-xs">
                  <p className="text-zinc-500">Reviewed By</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {order.approvedBy.name}
                  </p>
                  {order.approvedAt && (
                    <p className="text-zinc-500">
                      {new Date(order.approvedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              {order.rejectionReason && (
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-1.5 text-xs">
                  <p className="text-rose-600 font-medium">Rejection Reason</p>
                  <p className="text-zinc-700 dark:text-zinc-300 italic">
                    "{order.rejectionReason}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Phase 7: Incentive Information Card for APPROVED / COMPLETED orders */}
        {(order.status === 'APPROVED' || order.status === 'COMPLETED') && incentive && (
          <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20">
            <CardHeader className="py-3 px-6 border-b border-emerald-100 dark:border-emerald-900/30 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                <Percent className="size-4 text-emerald-600 dark:text-emerald-400" />
                Employee Sales Commission Incentive
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/incentives/${incentive._id}`)}
                className="text-xs h-7 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100/50 dark:border-emerald-800 dark:text-emerald-300"
              >
                <span>View Incentive</span>
              </Button>
            </CardHeader>
            <CardContent className="py-4 px-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-xs text-zinc-500 block">Commission Rate</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                    {incentive.percentage}%
                  </span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block">Incentive Amount</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                    ${incentive.incentiveAmount.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block">Payout Status</span>
                  <span className="mt-0.5 inline-block">
                    {incentive.status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="size-3" /> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <Clock className="size-3" /> Unpaid
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block">Sales Representative</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {incentive.employeeId?.name || order.employee?.name || 'Assigned Rep'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Line Items Table Card */}
        <Card>
          <CardHeader className="py-4 px-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Order Line Items</CardTitle>
              <CardDescription>
                Authoritatively computed product quantities and price breakdown
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Total Order Amount</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ${Number(order.totalAmount || 0).toFixed(2)}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
                  <tr>
                    <th className="py-3 px-6">#</th>
                    <th className="py-3 px-6">Product Name</th>
                    <th className="py-3 px-6 text-center">Quantity</th>
                    <th className="py-3 px-6 text-right">Unit Price</th>
                    <th className="py-3 px-6 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {order.items.map((item, index) => (
                    <tr key={index} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="py-3.5 px-6 text-xs text-zinc-400">{index + 1}</td>
                      <td className="py-3.5 px-6 font-medium text-zinc-900 dark:text-zinc-100">
                        {item.productName}
                      </td>
                      <td className="py-3.5 px-6 text-center text-zinc-700 dark:text-zinc-300">
                        {item.quantity}
                      </td>
                      <td className="py-3.5 px-6 text-right text-zinc-700 dark:text-zinc-300">
                        ${Number(item.unitPrice || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-6 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                        ${Number(item.totalPrice || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Notes Card */}
        {order.notes && (
          <Card>
            <CardHeader className="py-3 px-6">
              <CardTitle className="text-sm font-semibold">Notes / Instructions</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-4 text-sm text-zinc-700 dark:text-zinc-300">
              {order.notes}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog: Approve */}
      <AlertDialog open={confirmApproveOpen} onOpenChange={setConfirmApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this order for ${Number(order.totalAmount || 0).toFixed(2)}? Once approved, the order status will change to APPROVED.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveMutation.mutate()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Dialog with Reason input */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>
              Please specify the reason for rejecting this order. The sales representative will see this explanation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-medium mb-1 block">Rejection Reason</Label>
            <Input
              placeholder="e.g. Credit limit exceeded / Invalid product specs"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Complete */}
      <AlertDialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Order as Completed?</AlertDialogTitle>
            <AlertDialogDescription>
              This will transition the order from APPROVED to COMPLETED (terminal state).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => completeMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {completeMutation.isPending ? 'Completing...' : 'Mark Completed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog: Cancel */}
      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? Cancelled orders cannot be reopened or edited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate()}
              className="bg-zinc-800 hover:bg-zinc-900 text-white"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Order Dialog (for PENDING orders) */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-5 text-emerald-600" /> Edit Order
            </DialogTitle>
            <DialogDescription>
              Modify line items, quantities, pricing, and notes for this PENDING order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium mb-1 block">Order Date</Label>
              <Input
                type="date"
                value={editOrderDate}
                onChange={(e) => setEditOrderDate(e.target.value)}
              />
            </div>

            {/* Line Items */}
            <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Order Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddEditItem}
                  className="gap-1 text-xs"
                >
                  <Plus className="size-3.5" /> Add Product
                </Button>
              </div>

              <div className="space-y-2">
                {editItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="col-span-5">
                      <Label className="text-[10px] text-zinc-500 mb-0.5 block">Product Name *</Label>
                      <Input
                        placeholder="e.g. Premium Widget X"
                        value={item.productName}
                        onChange={(e) =>
                          handleEditItemChange(idx, 'productName', e.target.value)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] text-zinc-500 mb-0.5 block">Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleEditItemChange(idx, 'quantity', e.target.value)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] text-zinc-500 mb-0.5 block">Unit Price ($) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleEditItemChange(idx, 'unitPrice', e.target.value)
                        }
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <Label className="text-[10px] text-zinc-500 mb-0.5 block">Total ($)</Label>
                      <div className="py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        ${(
                          Math.round(
                            (Number(item.quantity) || 0) *
                              (Number(item.unitPrice) || 0) *
                              100,
                          ) / 100
                        ).toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={editItems.length <= 1}
                        onClick={() => handleRemoveEditItem(idx)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 p-1 size-8"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Calculated Total */}
              <div className="flex justify-end pt-3">
                <div className="text-right p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 min-w-[200px]">
                  <p className="text-xs text-zinc-500">Updated Order Total</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${calculatedEditTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <Label className="text-xs font-medium mb-1 block">Notes</Label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
