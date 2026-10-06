// User instruction: "9. Customers (/customers, /customers/[id]): Customer directory (Search, Filter by status/employee, Pagination, Customer cards/table with name, business name, phone, address, assigned employee, status), Customer detail (Customer profile, Visit history timeline, Orders list, Total revenue from customer, Quick action to log a visit or create order)."
// Importers/callers: Next.js App Router (/customers), AppShell
// Affected API: GET /api/customers, POST /api/customers, PATCH /api/customers/:id, PATCH /api/customers/:id/status, GET /api/employees
// Data schemas: Customer, CreateCustomerPayload, UpdateCustomerPayload, CustomerListResponse

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api/customers';
import { employeesApi } from '@/lib/api/employees';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
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
  Plus,
  Search,
  UserCheck,
  UserX,
  Edit2,
  Building,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type {
  Customer,
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from '@/types/customer.types';

export default function CustomersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [createForm, setCreateForm] = useState<CreateCustomerPayload>({
    customerName: '',
    businessName: '',
    phone: '',
    address: '',
    assignedEmployee: '',
  });
  const [editForm, setEditForm] = useState<UpdateCustomerPayload>({});
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const limit = 10;

  // Fetch employees list for ADMIN selection
  const { data: employeesData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ limit: 100, isActive: true }),
    enabled: isAdmin,
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['customers', page, search, statusFilter, employeeFilter],
    queryFn: () =>
      customersApi.list({
        page,
        limit,
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        employeeId: isAdmin && employeeFilter !== 'all' ? employeeFilter : undefined,
      }),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCreateOpen(false);
      setCreateForm({
        customerName: '',
        businessName: '',
        phone: '',
        address: '',
        assignedEmployee: '',
      });
      setCreateErrors({});
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || 'Failed to create customer';
      setCreateErrors({ submit: msg });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerPayload }) =>
      customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditOpen(false);
      setSelectedCustomer(null);
      setEditForm({});
      setEditErrors({});
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || 'Failed to update customer';
      setEditErrors({ submit: msg });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      customersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setConfirmOpen(false);
      setSelectedCustomer(null);
    },
  });

  const validateCreate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!createForm.customerName.trim()) errors.customerName = 'Customer name is required';
    if (!createForm.businessName.trim()) errors.businessName = 'Business name is required';
    if (!createForm.phone.trim()) errors.phone = 'Phone is required';
    if (!createForm.address.trim()) errors.address = 'Address is required';
    if (isAdmin && !createForm.assignedEmployee)
      errors.assignedEmployee = 'Assigned employee is required';
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEdit = (): boolean => {
    const errors: Record<string, string> = {};
    if (editForm.customerName !== undefined && !editForm.customerName.trim())
      errors.customerName = 'Customer name cannot be empty';
    if (editForm.businessName !== undefined && !editForm.businessName.trim())
      errors.businessName = 'Business name cannot be empty';
    if (editForm.phone !== undefined && !editForm.phone.trim())
      errors.phone = 'Phone cannot be empty';
    if (editForm.address !== undefined && !editForm.address.trim())
      errors.address = 'Address cannot be empty';
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = () => {
    if (!validateCreate()) return;
    createMutation.mutate(createForm);
  };

  const handleEdit = () => {
    if (!selectedCustomer || !validateEdit()) return;
    updateMutation.mutate({ id: selectedCustomer._id, data: editForm });
  };

  const handleStatusToggle = () => {
    if (!selectedCustomer) return;
    statusMutation.mutate({
      id: selectedCustomer._id,
      status: selectedCustomer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    });
  };

  const openEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditForm({
      customerName: customer.customerName,
      businessName: customer.businessName,
      phone: customer.phone,
      address: customer.address,
      assignedEmployee: customer.assignedEmployee?._id,
    });
    setEditErrors({});
    setEditOpen(true);
  };

  const openConfirm = (customer: Customer) => {
    setSelectedCustomer(customer);
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Standard Header */}
      <PageHeader
        title={isAdmin ? 'Customer Directory' : 'My Client Portfolio'}
        subtitle={
          isAdmin
            ? 'Manage all registered client enterprises, regional accounts, and sales executive assignments.'
            : 'Access and review your assigned customer accounts, logged visits, and pending transactions.'
        }
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Building className="size-3.5" />
            {data?.total !== undefined ? `${data.total} Accounts` : 'Directory'}
          </span>
        }
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5 text-xs text-foreground hover:bg-muted"
          title="Refresh list"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
          <span>Refresh</span>
        </Button>

        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          <Plus className="size-4" />
          <span>Add Customer</span>
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by contact name, company, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs h-9 bg-background border-border"
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              value={statusFilter}
              onValueChange={(v: 'all' | 'ACTIVE' | 'INACTIVE') => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger id="status" className="h-9 text-xs bg-background border-border">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active Accounts</SelectItem>
                <SelectItem value="INACTIVE">Inactive Accounts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employee Filter (Admin only) */}
          {isAdmin && (
            <div>
              <Select
                value={employeeFilter}
                onValueChange={(v: string) => {
                  setEmployeeFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger id="employeeFilter" className="h-9 text-xs bg-background border-border">
                  <SelectValue placeholder="All Representatives" />
                </SelectTrigger>
                <SelectContent>
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
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border text-center space-y-3">
          <RefreshCw className="size-8 animate-spin text-primary" />
          <p className="font-semibold text-foreground">Loading customers...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <EmptyState
          icon={Building}
          title="Failed to load customers"
          description="There was an error communicating with the server. Please try again."
          action={{
            label: 'Retry Loading',
            onClick: () => refetch(),
          }}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && data && data.items.length === 0 && (
        <EmptyState
          icon={Building}
          title="No customers found"
          description={
            search || statusFilter !== 'all' || employeeFilter !== 'all'
              ? 'No customer accounts match your search filters. Try resetting the criteria.'
              : 'Start building your client portfolio by registering your first customer account.'
          }
          action={
            search || statusFilter !== 'all' || employeeFilter !== 'all'
              ? {
                  label: 'Clear Filters',
                  onClick: () => {
                    setSearch('');
                    setStatusFilter('all');
                    setEmployeeFilter('all');
                    setPage(1);
                  },
                }
              : {
                  label: 'Add Customer',
                  onClick: () => setCreateOpen(true),
                }
          }
        />
      )}

      {/* Customer Directory Table */}
      {!isLoading && !error && data && data.items.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Customer & Company</th>
                  <th className="py-3 px-3">Contact Details</th>
                  <th className="py-3 px-3">Location / Address</th>
                  <th className="py-3 px-3">Assigned Representative</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.items.map((customer) => (
                  <tr
                    key={customer._id}
                    className="hover:bg-muted/40 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/customers/${customer._id}`)}
                  >
                    {/* Customer & Company */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {customer.customerName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {customer.customerName}
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                            <Building className="size-3 text-primary/70 shrink-0" />
                            <span>{customer.businessName}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact Details */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 text-foreground font-mono text-[11px]">
                        <Phone className="size-3 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-3 max-w-[200px]">
                      <div className="flex items-start gap-1 text-muted-foreground truncate">
                        <MapPin className="size-3 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    </td>

                    {/* Assigned Employee */}
                    <td className="py-3.5 px-3">
                      {customer.assignedEmployee ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {customer.assignedEmployee.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {customer.assignedEmployee.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={customer.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => router.push(`/customers/${customer._id}`)}
                          className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="View customer profile"
                        >
                          <Eye className="size-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(customer)}
                          className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Edit customer"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>

                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openConfirm(customer)}
                            className={
                              customer.status === 'ACTIVE'
                                ? 'size-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                                : 'size-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                            }
                            title={
                              customer.status === 'ACTIVE'
                                ? 'Deactivate customer'
                                : 'Activate customer'
                            }
                          >
                            {customer.status === 'ACTIVE' ? (
                              <UserX className="size-3.5" />
                            ) : (
                              <UserCheck className="size-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/60 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Showing page <span className="font-semibold text-foreground">{data.page}</span> of{' '}
                <span className="font-semibold text-foreground">{data.totalPages}</span> (
                <span className="font-semibold text-foreground">{data.total}</span> total accounts)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-8 text-xs gap-1 text-foreground"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs gap-1 text-foreground"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Customer Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">Add New Customer</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Register a new client enterprise account in the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <Label htmlFor="create-customerName" className="text-foreground text-xs">
                Contact / Customer Name <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="create-customerName"
                placeholder="e.g., Rajesh Sharma"
                value={createForm.customerName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, customerName: e.target.value })
                }
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {createErrors.customerName && (
                <p className="mt-1 text-[11px] text-rose-400">{createErrors.customerName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="create-businessName" className="text-foreground text-xs">
                Business / Enterprise Name <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="create-businessName"
                placeholder="e.g., Sharma Textiles Ltd."
                value={createForm.businessName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, businessName: e.target.value })
                }
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {createErrors.businessName && (
                <p className="mt-1 text-[11px] text-rose-400">{createErrors.businessName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="create-phone" className="text-foreground text-xs">
                Phone Number <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="create-phone"
                placeholder="e.g., +91 98765 43210"
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm({ ...createForm, phone: e.target.value })
                }
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {createErrors.phone && (
                <p className="mt-1 text-[11px] text-rose-400">{createErrors.phone}</p>
              )}
            </div>

            <div>
              <Label htmlFor="create-address" className="text-foreground text-xs">
                Billing / Delivery Address <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="create-address"
                placeholder="e.g., Tactical Park, Phase II"
                value={createForm.address}
                onChange={(e) =>
                  setCreateForm({ ...createForm, address: e.target.value })
                }
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {createErrors.address && (
                <p className="mt-1 text-[11px] text-rose-400">{createErrors.address}</p>
              )}
            </div>

            {isAdmin && (
              <div>
                <Label htmlFor="create-assignedEmployee" className="text-foreground text-xs">
                  Assigned Sales Representative <span className="text-rose-400">*</span>
                </Label>
                <Select
                  value={createForm.assignedEmployee}
                  onValueChange={(v: string) =>
                    setCreateForm({ ...createForm, assignedEmployee: v })
                  }
                >
                  <SelectTrigger
                    id="create-assignedEmployee"
                    className="mt-1 h-9 text-xs bg-background border-border"
                  >
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesData?.items?.map((emp) => (
                      <SelectItem key={emp._id} value={emp._id}>
                        {emp.name} ({emp.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createErrors.assignedEmployee && (
                  <p className="mt-1 text-[11px] text-rose-400">
                    {createErrors.assignedEmployee}
                  </p>
                )}
              </div>
            )}

            {createErrors.submit && (
              <p className="text-xs text-rose-400 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                {createErrors.submit}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
              className="text-xs text-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              {createMutation.isPending ? 'Creating...' : 'Register Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">Edit Customer Details</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Update contact information and account assignment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <Label htmlFor="edit-customerName" className="text-foreground text-xs">
                Customer Name
              </Label>
              <Input
                id="edit-customerName"
                value={editForm.customerName || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, customerName: e.target.value })
                }
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {editErrors.customerName && (
                <p className="mt-1 text-[11px] text-rose-400">{editErrors.customerName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-businessName" className="text-foreground text-xs">
                Business Name
              </Label>
              <Input
                id="edit-businessName"
                value={editForm.businessName || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, businessName: e.target.value })
                }
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {editErrors.businessName && (
                <p className="mt-1 text-[11px] text-rose-400">{editErrors.businessName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-phone" className="text-foreground text-xs">
                Phone
              </Label>
              <Input
                id="edit-phone"
                value={editForm.phone || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {editErrors.phone && (
                <p className="mt-1 text-[11px] text-rose-400">{editErrors.phone}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-address" className="text-foreground text-xs">
                Address
              </Label>
              <Input
                id="edit-address"
                value={editForm.address || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, address: e.target.value })
                }
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {editErrors.address && (
                <p className="mt-1 text-[11px] text-rose-400">{editErrors.address}</p>
              )}
            </div>

            {isAdmin && (
              <div>
                <Label htmlFor="edit-assignedEmployee" className="text-foreground text-xs">
                  Assigned Representative
                </Label>
                <Select
                  value={editForm.assignedEmployee || ''}
                  onValueChange={(v: string) =>
                    setEditForm({ ...editForm, assignedEmployee: v })
                  }
                >
                  <SelectTrigger
                    id="edit-assignedEmployee"
                    className="mt-1 h-9 text-xs bg-background border-border"
                  >
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesData?.items?.map((emp) => (
                      <SelectItem key={emp._id} value={emp._id}>
                        {emp.name} ({emp.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editErrors.submit && (
              <p className="text-xs text-rose-400 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                {editErrors.submit}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
              className="text-xs text-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleEdit}
              disabled={updateMutation.isPending}
              className="text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activation / Deactivation Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-heading">
              {selectedCustomer?.status === 'ACTIVE'
                ? 'Deactivate Customer Account?'
                : 'Reactivate Customer Account?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              Are you sure you want to mark{' '}
              <span className="font-semibold text-foreground">
                {selectedCustomer?.customerName} ({selectedCustomer?.businessName})
              </span>{' '}
              as {selectedCustomer?.status === 'ACTIVE' ? 'Inactive' : 'Active'}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusToggle}
              disabled={statusMutation.isPending}
              className={`text-xs font-semibold ${
                selectedCustomer?.status === 'ACTIVE'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {statusMutation.isPending ? 'Updating...' : 'Confirm Status Change'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
