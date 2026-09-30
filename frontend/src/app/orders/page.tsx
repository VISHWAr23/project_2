// User instruction: "Phase 6: Order Management - Create frontend Orders list and creation UI"
// Importers/callers: Next.js App Router (/orders)
// Affected API: /api/orders (list, create), /api/customers, /api/employees
// Data schemas: Order, OrderItem, OrderStatus, CreateOrderPayload, OrderQueryParams, OrderListResponse

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ordersApi } from '@/lib/api/orders';
import { customersApi } from '@/lib/api/customers';
import { employeesApi } from '@/lib/api/employees';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Eye,
  ShoppingCart,
  DollarSign,
  Calendar,
  User as UserIcon,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  ArrowLeft,
} from 'lucide-react';
import type { OrderStatus, CreateOrderItemPayload } from '@/types/order.types';

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Filters & Pagination state
  const [page, setPage] = useState(1);
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Create Order Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CreateOrderItemPayload[]>([
    { productName: '', quantity: 1, unitPrice: 0 },
  ]);
  const [createError, setCreateError] = useState<string | null>(null);

  const limit = 10;

  // 1. Fetch Orders query
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: [
      'orders',
      page,
      limit,
      employeeFilter,
      customerFilter,
      statusFilter,
      startDate,
      endDate,
    ],
    queryFn: () =>
      ordersApi.list({
        page,
        limit,
        employeeId: isAdmin && employeeFilter !== 'all' ? employeeFilter : undefined,
        customerId: customerFilter !== 'all' ? customerFilter : undefined,
        status: statusFilter !== 'all' ? (statusFilter as OrderStatus) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    staleTime: 5000,
  });

  // 2. Fetch Customers for dropdowns
  const { data: customersData } = useQuery({
    queryKey: ['customers-list-dropdown'],
    queryFn: () => customersApi.list({ limit: 100 }),
    staleTime: 30000,
  });

  // 3. Fetch Employees for Admin filter dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['employees-list-dropdown'],
    queryFn: () => employeesApi.list({ limit: 100 }),
    enabled: isAdmin,
    staleTime: 30000,
  });

  // Active customers list
  const activeCustomers = (customersData?.items || []).filter(
    (c) => c.status === 'ACTIVE',
  );

  // Line item helpers
  const handleAddItem = () => {
    setItems((prev) => [...prev, { productName: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof CreateOrderItemPayload,
    value: any,
  ) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Live client-side calculation for UI preview (backend recalculates authoritatively)
  const calculatedTotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return Math.round((sum + qty * price) * 100) / 100;
  }, 0);

  // Create Order Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId) {
        throw new Error('Please select a customer');
      }
      if (!items || items.length === 0) {
        throw new Error('Please add at least one item');
      }
      for (const item of items) {
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

      return ordersApi.create({
        customer: selectedCustomerId,
        orderDate: orderDate ? new Date(orderDate).toISOString() : undefined,
        items: items.map((it) => ({
          productName: it.productName.trim(),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setCreateOpen(false);
      setSelectedCustomerId('');
      setNotes('');
      setItems([{ productName: '', quantity: 1, unitPrice: 0 }]);
      setCreateError(null);
    },
    onError: (err: any) => {
      setCreateError(
        err.response?.data?.message || err.message || 'Failed to create order',
      );
    },
  });

  // Status badge renderer
  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
            <Clock className="size-3" /> Pending
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
            <CheckCircle className="size-3" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
            <XCircle className="size-3" /> Rejected
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
            <CheckCircle className="size-3" /> Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            <Ban className="size-3" /> Cancelled
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" /> Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {isAdmin ? 'Order Management' : 'My Orders'}
              </h1>
              <p className="text-sm text-zinc-500">
                {isAdmin
                  ? 'Review, approve, and track all customer orders'
                  : 'Create and track orders for your assigned customers'}
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              setCreateError(null);
              setCreateOpen(true);
            }}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="size-4" /> Create Order
          </Button>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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

              {/* Customer filter */}
              <div>
                <Label className="text-xs text-zinc-500 mb-1 block">Customer</Label>
                <Select
                  value={customerFilter}
                  onValueChange={(val: string) => {
                    setCustomerFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {(customersData?.items || []).map((cust) => (
                      <SelectItem key={cust._id} value={cust._id}>
                        {cust.customerName} ({cust.businessName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status filter */}
              <div>
                <Label className="text-xs text-zinc-500 mb-1 block">Status</Label>
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
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader className="py-4 px-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Orders List ({ordersData?.total || 0})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="p-8 text-center text-zinc-500">Loading orders...</div>
            ) : !ordersData?.items || ordersData.items.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                No orders found matching the filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      {isAdmin && <th className="py-3 px-4">Employee</th>}
                      <th className="py-3 px-4 text-center">Items</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {ordersData.items.map((order) => (
                      <tr
                        key={order._id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {order.customer?.customerName || 'N/A'}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {order.customer?.businessName}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4">
                            <div className="text-zinc-900 dark:text-zinc-100">
                              {order.employee?.name || 'Unassigned'}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {order.employee?.email}
                            </div>
                          </td>
                        )}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {order.items?.length || 0} item{order.items?.length === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          ${Number(order.totalAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {renderStatusBadge(order.status)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/orders/${order._id}`)}
                            className="gap-1.5"
                          >
                            <Eye className="size-3.5" /> Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {ordersData && ordersData.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-xs text-zinc-500">
                  Showing page {ordersData.page} of {ordersData.totalPages} ({ordersData.total} total orders)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={ordersData.page <= 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={ordersData.page >= ordersData.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Order Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5 text-emerald-600" /> Create New Order
            </DialogTitle>
            <DialogDescription>
              Record an order with products, quantities, and pricing. Totals are calculated authoritatively by the backend.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="p-3 text-sm rounded bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              {createError}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer Selection */}
              <div>
                <Label className="text-xs font-medium mb-1 block">Customer *</Label>
                <Select
                  value={selectedCustomerId}
                  onValueChange={setSelectedCustomerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select active customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCustomers.map((cust) => (
                      <SelectItem key={cust._id} value={cust._id}>
                        {cust.customerName} ({cust.businessName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Order Date */}
              <div>
                <Label className="text-xs font-medium mb-1 block">Order Date *</Label>
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Order Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="gap-1 text-xs"
                >
                  <Plus className="size-3.5" /> Add Product
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
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
                          handleItemChange(idx, 'productName', e.target.value)
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
                          handleItemChange(idx, 'quantity', e.target.value)
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
                          handleItemChange(idx, 'unitPrice', e.target.value)
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
                        disabled={items.length <= 1}
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 p-1 size-8"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live summary */}
              <div className="flex justify-end pt-3">
                <div className="text-right p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 min-w-[200px]">
                  <p className="text-xs text-zinc-500">Calculated Order Total</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${calculatedTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <Label className="text-xs font-medium mb-1 block">Notes / Special Instructions</Label>
              <Input
                placeholder="Optional notes or delivery instructions"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
