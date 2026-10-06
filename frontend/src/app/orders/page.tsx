// User instruction: "12. Orders (/orders, /orders/[id]): Order creation (Select customer, add products from catalog with quantity/price/discounts, tax calculation, total computation, notes), Order list (Search, filter by status/date/customer/sales rep, sorting, status badges, pagination), Order detail (Full order breakdown, line items table, customer & sales rep info, status update workflow [Draft -> Submitted -> Approved -> In Production -> Shipped -> Delivered / Cancelled], order timeline/audit history, PDF invoice generation/download simulator)."
// Importers/callers: Next.js App Router (/orders), AppShell, Sidebar navigation
// Affected API: GET /api/orders, POST /api/orders, GET /api/customers, GET /api/employees
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { CurrencyDisplay } from '@/components/ui/currency-display';
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
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Receipt,
  FileSpreadsheet,
  PackageCheck,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { OrderStatus, CreateOrderItemPayload } from '@/types/order.types';
import { formatDate } from '@/lib/format';

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
  const [searchQuery, setSearchQuery] = useState<string>('');

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
  const { data: ordersData, isLoading: ordersLoading, error } = useQuery({
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
    enabled: !!user,
  });

  // 2. Fetch Customers for dropdowns
  const { data: customersData } = useQuery({
    queryKey: ['customers-list-dropdown'],
    queryFn: () => customersApi.list({ limit: 100 }),
    enabled: !!user,
    staleTime: 30000,
  });

  // 3. Fetch Employees for Admin filter dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['employees-list-dropdown'],
    queryFn: () => employeesApi.list({ limit: 100 }),
    enabled: !!user && isAdmin,
    staleTime: 30000,
  });

  // Active customers list
  const activeCustomers = (customersData?.items || []).filter(
    (c) => c.status === 'ACTIVE'
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
    value: any
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
        err.response?.data?.message || err.message || 'Failed to create order'
      );
    },
  });

  const orderList = ordersData?.items || [];

  // Filter client-side search query
  const filteredOrders = orderList.filter((order) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const customerName =
      typeof order.customer === 'object'
        ? (order.customer?.customerName || order.customer?.businessName || '').toLowerCase()
        : '';
    const orderId = (order._id || '').toLowerCase();
    const notesStr = (order.notes || '').toLowerCase();
    return customerName.includes(q) || orderId.includes(q) || notesStr.includes(q);
  });

  // Aggregate stats
  const totalVolume = orderList.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const pendingCount = orderList.filter((o) => o.status === 'PENDING').length;
  const completedCount = orderList.filter((o) => o.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={isAdmin ? 'Commercial Order Operations' : 'My Sales Orders'}
        subtitle={
          isAdmin
            ? 'Review, approve, and track wholesale orders, billing workflows, and fulfillment milestones.'
            : 'Draft and submit line-item purchase orders for your portfolio of clients.'
        }
      >
        <Button
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          <span>Create New Order</span>
        </Button>
      </PageHeader>

      {/* High-Level Order Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Orders"
          value={ordersData?.total || 0}
          icon={ShoppingCart}
          description="Total orders in pipeline"
        />
        <StatCard
          title="Pipeline Volume"
          value={<CurrencyDisplay amount={totalVolume} />}
          icon={Receipt}
          description="Gross order value on page"
        />
        <StatCard
          title="Pending Approval"
          value={pendingCount}
          icon={Clock}
          description="Awaiting administrative sign-off"
        />
        <StatCard
          title="Completed Orders"
          value={completedCount}
          icon={PackageCheck}
          description="Delivered & finalized"
        />
      </div>

      {/* Filter and Status Toolbar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Filter className="size-3.5 text-primary" />
              <span>Refine Commercial Orders</span>
            </div>

            {/* Quick Status Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(['all', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === st
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
                  }`}
                >
                  {st === 'all' ? 'All Statuses' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1 border-t border-border/60">
            {/* Search Input */}
            <div className="relative">
              <Label htmlFor="orderSearch" className="text-[11px] text-muted-foreground">
                Search Orders
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  id="orderSearch"
                  placeholder="Customer, order ID, note..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background border-border"
                />
              </div>
            </div>

            {/* Customer Dropdown */}
            <div>
              <Label htmlFor="customerFilter" className="text-[11px] text-muted-foreground">
                Account
              </Label>
              <Select
                value={customerFilter}
                onValueChange={(v: string) => {
                  setCustomerFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger id="customerFilter" className="mt-1 h-8 text-xs bg-background border-border">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Accounts</SelectItem>
                  {customersData?.items?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.customerName || c.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sales Rep (Admin Only) */}
            {isAdmin && (
              <div>
                <Label htmlFor="employeeFilter" className="text-[11px] text-muted-foreground">
                  Sales Representative
                </Label>
                <Select
                  value={employeeFilter}
                  onValueChange={(v: string) => {
                    setEmployeeFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="employeeFilter" className="mt-1 h-8 text-xs bg-background border-border">
                    <SelectValue placeholder="All Representatives" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">All Representatives</SelectItem>
                    {employeesData?.items?.map((emp) => (
                      <SelectItem key={emp._id} value={emp._id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Range */}
            <div>
              <Label htmlFor="startDate" className="text-[11px] text-muted-foreground">
                From Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="mt-1 h-8 text-xs bg-background border-border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading & Error States */}
      {ordersLoading && (
        <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
          <RefreshCw className="size-8 animate-spin text-primary" />
          <p className="font-semibold text-foreground text-sm">Loading purchase orders...</p>
        </div>
      )}

      {error && (
        <EmptyState
          icon={ShoppingCart}
          title="Failed to Load Orders"
          description="Could not synchronize commercial order records from the server."
        />
      )}

      {/* Orders Table */}
      {!ordersLoading && !error && (
        <Card className="bg-card border-border overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ShoppingCart}
                title="No Matching Orders Found"
                description="No purchase orders match your current filters or search terms."
                action={{
                  label: 'Clear Filters',
                  onClick: () => {
                    setCustomerFilter('all');
                    setEmployeeFilter('all');
                    setStatusFilter('all');
                    setStartDate('');
                    setEndDate('');
                    setSearchQuery('');
                  },
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Order ID & Date</th>
                    <th className="py-3 px-3">Customer Account</th>
                    <th className="py-3 px-3">Sales Representative</th>
                    <th className="py-3 px-3">Line Items</th>
                    <th className="py-3 px-3 text-right">Order Total</th>
                    <th className="py-3 px-3 text-center">Fulfillment Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredOrders.map((order) => {
                    const customerName =
                      typeof order.customer === 'object'
                        ? order.customer?.customerName || order.customer?.businessName || 'Customer Account'
                        : 'Customer Account';
                    const employeeName =
                      typeof order.employee === 'object' ? order.employee?.name : 'Representative';
                    const itemsSummary = (order.items || [])
                      .map((it) => `${it.productName} (x${it.quantity})`)
                      .join(', ');

                    return (
                      <tr
                        key={order._id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        onClick={() => router.push(`/orders/${order._id}`)}
                      >
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                            #{order._id.slice(-6).toUpperCase()}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="size-3" />
                            {formatDate(order.orderDate || order.createdAt)}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-foreground font-heading">
                            {customerName}
                          </div>
                          {typeof order.customer === 'object' && (order.customer as any)?.email && (
                            <div className="text-[11px] text-muted-foreground">
                              {(order.customer as any).email}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-muted-foreground">
                          <div className="text-foreground font-medium">{employeeName}</div>
                        </td>

                        <td className="py-3 px-3 max-w-xs truncate text-muted-foreground">
                          <span className="font-mono text-foreground font-medium mr-1.5">
                            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}:
                          </span>
                          <span>{itemsSummary || 'Standard SKU'}</span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-foreground text-sm">
                          <CurrencyDisplay amount={order.totalAmount} />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <StatusBadge status={order.status} />
                        </td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/orders/${order._id}`)}
                            className="gap-1 text-xs text-primary hover:text-primary font-semibold"
                          >
                            <Eye className="size-3.5" />
                            <span>View</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {ordersData && ordersData.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
              <p className="text-muted-foreground">
                Page <span className="text-foreground font-semibold font-mono">{ordersData.page}</span> of{' '}
                <span className="text-foreground font-semibold font-mono">{ordersData.totalPages}</span> ·{' '}
                <span className="text-foreground font-semibold font-mono">{ordersData.total}</span> total orders
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="gap-1 text-xs text-foreground"
                >
                  <ChevronLeft className="size-3.5" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === ordersData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="gap-1 text-xs text-foreground"
                >
                  Next <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Create Order Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading flex items-center gap-2">
              <ShoppingCart className="size-4 text-primary" />
              Draft New Commercial Order
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select an active customer account, configure order line items, and submit for fulfillment review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-customer" className="text-xs text-foreground">
                  Target Customer Account <span className="text-rose-400">*</span>
                </Label>
                <Select
                  value={selectedCustomerId}
                  onValueChange={setSelectedCustomerId}
                >
                  <SelectTrigger id="create-customer" className="mt-1 h-9 text-xs bg-background border-border">
                    <SelectValue placeholder="Select active customer" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {activeCustomers.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.customerName || c.businessName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="create-orderDate" className="text-xs text-foreground">
                  Order Date <span className="text-rose-400">*</span>
                </Label>
                <Input
                  id="create-orderDate"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="mt-1 h-9 text-xs bg-background border-border font-mono"
                />
              </div>
            </div>

            {/* Line Items Section */}
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileSpreadsheet className="size-3.5 text-primary" />
                  Order Line Items
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="gap-1 text-xs text-foreground font-medium"
                >
                  <Plus className="size-3 text-primary" />
                  <span>Add Line Item</span>
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 p-3 bg-background rounded-lg border border-border items-end"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <Label className="text-[11px] text-muted-foreground">Product Description</Label>
                      <Input
                        placeholder="Item name / SKU"
                        value={item.productName}
                        onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                        className="mt-1 h-8 text-xs bg-card border-border"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-[11px] text-muted-foreground">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="mt-1 h-8 text-xs bg-card border-border font-mono"
                      />
                    </div>

                    <div className="col-span-5 sm:col-span-3">
                      <Label className="text-[11px] text-muted-foreground">Unit Price (₹)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
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
                        disabled={items.length <= 1}
                        onClick={() => handleRemoveItem(idx)}
                        className="size-8 text-muted-foreground hover:text-rose-400"
                        title="Remove item"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Total Preview Box */}
              <div className="p-3 bg-muted/30 rounded-lg border border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">
                  Total Order Value (Calculated):
                </span>
                <span className="text-base font-bold font-mono text-primary">
                  <CurrencyDisplay amount={calculatedTotal} />
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="create-notes" className="text-xs text-foreground">
                Delivery Instructions & Commercial Notes
              </Label>
              <Input
                id="create-notes"
                placeholder="Shipping instructions, payment terms, or reference numbers"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
            </div>

            {createError && (
              <p className="text-xs text-rose-400 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                {createError}
              </p>
            )}
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="text-xs text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              {createMutation.isPending ? 'Submitting Order...' : 'Submit Commercial Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
