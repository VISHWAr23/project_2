// User instruction: "Phase 4: Customer Management - Create Customer Management UI"
// Importers/callers: Next.js App Router
// Affected API: /api/customers endpoints (list, create, update, status toggle)
// Data schemas: Customer, CreateCustomerPayload, UpdateCustomerPayload, CustomerListResponse

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, UserCheck, UserX, Edit2 } from 'lucide-react';
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', page, search, statusFilter, employeeFilter],
    queryFn: () =>
      customersApi.list({
        page,
        limit,
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        employeeId: isAdmin && employeeFilter !== 'all' ? employeeFilter : undefined,
      }),
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isAdmin ? 'Customer Management' : 'My Customers'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isAdmin
                ? 'Oversee all clients and employee assignments'
                : 'Manage your assigned clients and accounts'}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search name, business, phone"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v: 'all' | 'ACTIVE' | 'INACTIVE') => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isAdmin && (
                <div>
                  <Label htmlFor="employeeFilter">Assigned Employee</Label>
                  <Select
                    value={employeeFilter}
                    onValueChange={(v: string) => {
                      setEmployeeFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger id="employeeFilter">
                      <SelectValue placeholder="All Employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
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
          </CardContent>
        </Card>

        {isLoading && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Loading customers...
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="py-12 text-center text-red-600">
              Failed to load customers. Please try again.
            </CardContent>
          </Card>
        )}

        {data && data.items.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No customers found. Click Add Customer to get started.
            </CardContent>
          </Card>
        )}

        {data && data.items.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Customer Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Business Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Assigned Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {data.items.map((customer) => (
                      <tr key={customer._id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {customer.customerName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {customer.businessName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {customer.phone}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {customer.address}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {customer.assignedEmployee?.name || 'Unassigned'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {customer.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/customers/${customer._id}`)}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(customer)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openConfirm(customer)}
                              >
                                {customer.status === 'ACTIVE' ? (
                                  <UserX className="h-4 w-4 text-red-600" />
                                ) : (
                                  <UserCheck className="h-4 w-4 text-green-600" />
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

              {data.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-gray-500">
                    Page {data.page} of {data.totalPages} · {data.total} total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>Register a new customer or business account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-customerName">Customer Name</Label>
              <Input
                id="create-customerName"
                value={createForm.customerName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, customerName: e.target.value })
                }
              />
              {createErrors.customerName && (
                <p className="mt-1 text-sm text-red-600">{createErrors.customerName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="create-businessName">Business Name</Label>
              <Input
                id="create-businessName"
                value={createForm.businessName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, businessName: e.target.value })
                }
              />
              {createErrors.businessName && (
                <p className="mt-1 text-sm text-red-600">{createErrors.businessName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="create-phone">Phone</Label>
              <Input
                id="create-phone"
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm({ ...createForm, phone: e.target.value })
                }
              />
              {createErrors.phone && (
                <p className="mt-1 text-sm text-red-600">{createErrors.phone}</p>
              )}
            </div>
            <div>
              <Label htmlFor="create-address">Address</Label>
              <Input
                id="create-address"
                value={createForm.address}
                onChange={(e) =>
                  setCreateForm({ ...createForm, address: e.target.value })
                }
              />
              {createErrors.address && (
                <p className="mt-1 text-sm text-red-600">{createErrors.address}</p>
              )}
            </div>

            {isAdmin && (
              <div>
                <Label htmlFor="create-assignedEmployee">Assigned Employee</Label>
                <Select
                  value={createForm.assignedEmployee}
                  onValueChange={(v: string) =>
                    setCreateForm({ ...createForm, assignedEmployee: v })
                  }
                >
                  <SelectTrigger id="create-assignedEmployee">
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
                  <p className="mt-1 text-sm text-red-600">{createErrors.assignedEmployee}</p>
                )}
              </div>
            )}

            {createErrors.submit && (
              <p className="text-sm text-red-600">{createErrors.submit}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update customer profile information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-customerName">Customer Name</Label>
              <Input
                id="edit-customerName"
                value={editForm.customerName || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, customerName: e.target.value })
                }
              />
              {editErrors.customerName && (
                <p className="mt-1 text-sm text-red-600">{editErrors.customerName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-businessName">Business Name</Label>
              <Input
                id="edit-businessName"
                value={editForm.businessName || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, businessName: e.target.value })
                }
              />
              {editErrors.businessName && (
                <p className="mt-1 text-sm text-red-600">{editErrors.businessName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />
              {editErrors.phone && <p className="mt-1 text-sm text-red-600">{editErrors.phone}</p>}
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editForm.address || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, address: e.target.value })
                }
              />
              {editErrors.address && <p className="mt-1 text-sm text-red-600">{editErrors.address}</p>}
            </div>

            {isAdmin && (
              <div>
                <Label htmlFor="edit-assignedEmployee">Assigned Employee</Label>
                <Select
                  value={editForm.assignedEmployee || ''}
                  onValueChange={(v: string) =>
                    setEditForm({ ...editForm, assignedEmployee: v })
                  }
                >
                  <SelectTrigger id="edit-assignedEmployee">
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
              <p className="text-sm text-red-600">{editErrors.submit}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedCustomer?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} Customer?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to{' '}
              {selectedCustomer?.status === 'ACTIVE' ? 'deactivate' : 'activate'}{' '}
              {selectedCustomer?.customerName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusToggle} disabled={statusMutation.isPending}>
              {statusMutation.isPending ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
