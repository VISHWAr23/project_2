// User instruction: "Phase 3: Employee Management - Create the Employee Management UI using the existing frontend architecture and components. Admin routes: /employees"
// Importers/callers: Next.js App Router
// Affected API: /api/employees (list, create, update, updateStatus)
// Data schemas: Employee, CreateEmployeePayload, UpdateEmployeePayload, EmployeeListResponse

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/lib/api/employees';
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
  CreateEmployeePayload,
  UpdateEmployeePayload,
  Employee,
} from '@/types/employee.types';

export default function EmployeesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [createForm, setCreateForm] = useState<CreateEmployeePayload>({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [editForm, setEditForm] = useState<UpdateEmployeePayload>({});
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const limit = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', page, search, statusFilter],
    queryFn: () =>
      employeesApi.list({
        page,
        limit,
        search: search || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      }),
  });

  const createMutation = useMutation({
    mutationFn: employeesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setCreateOpen(false);
      setCreateForm({ name: '', email: '', phone: '', password: '' });
      setCreateErrors({});
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || 'Failed to create employee';
      setCreateErrors({ submit: msg });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeePayload }) =>
      employeesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditOpen(false);
      setSelectedEmployee(null);
      setEditForm({});
      setEditErrors({});
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || 'Failed to update employee';
      setEditErrors({ submit: msg });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      employeesApi.updateStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setConfirmOpen(false);
      setSelectedEmployee(null);
    },
  });

  const validateCreate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!createForm.name.trim()) errors.name = 'Name is required';
    if (!createForm.email.trim()) errors.email = 'Email is required';
    if (!createForm.phone.trim()) errors.phone = 'Phone is required';
    if (!createForm.password || createForm.password.length < 6)
      errors.password = 'Password must be at least 6 characters';
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEdit = (): boolean => {
    const errors: Record<string, string> = {};
    if (editForm.name !== undefined && !editForm.name.trim()) errors.name = 'Name cannot be empty';
    if (editForm.email !== undefined && !editForm.email.trim())
      errors.email = 'Email cannot be empty';
    if (editForm.phone !== undefined && !editForm.phone.trim())
      errors.phone = 'Phone cannot be empty';
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = () => {
    if (!validateCreate()) return;
    createMutation.mutate(createForm);
  };

  const handleEdit = () => {
    if (!selectedEmployee || !validateEdit()) return;
    updateMutation.mutate({ id: selectedEmployee._id, data: editForm });
  };

  const handleStatusToggle = () => {
    if (!selectedEmployee) return;
    statusMutation.mutate({
      id: selectedEmployee._id,
      isActive: !selectedEmployee.isActive,
    });
  };

  const openEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditForm({ name: employee.name, email: employee.email, phone: employee.phone });
    setEditErrors({});
    setEditOpen(true);
  };

  const openConfirm = (employee: Employee) => {
    setSelectedEmployee(employee);
    setConfirmOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by name, email, or phone"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v: 'all' | 'active' | 'inactive') => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">Loading employees...</CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="py-12 text-center text-red-600">
              Failed to load employees. Please try again.
            </CardContent>
          </Card>
        )}

        {data && data.items.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No employees found. Add your first employee to get started.
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
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Phone
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
                    {data.items.map((employee) => (
                      <tr key={employee._id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {employee.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {employee.email}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {employee.phone}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {employee.isActive ? (
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
                              onClick={() => router.push(`/employees/${employee._id}`)}
                            >
                              View
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(employee)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openConfirm(employee)}
                            >
                              {employee.isActive ? (
                                <UserX className="h-4 w-4 text-red-600" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>Create a new employee account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
              {createErrors.name && (
                <p className="mt-1 text-sm text-red-600">{createErrors.name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
              {createErrors.email && (
                <p className="mt-1 text-sm text-red-600">{createErrors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="create-phone">Phone</Label>
              <Input
                id="create-phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              />
              {createErrors.phone && (
                <p className="mt-1 text-sm text-red-600">{createErrors.phone}</p>
              )}
            </div>
            <div>
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
              {createErrors.password && (
                <p className="mt-1 text-sm text-red-600">{createErrors.password}</p>
              )}
            </div>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              {editErrors.name && <p className="mt-1 text-sm text-red-600">{editErrors.name}</p>}
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              {editErrors.email && <p className="mt-1 text-sm text-red-600">{editErrors.email}</p>}
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
              {editErrors.phone && <p className="mt-1 text-sm text-red-600">{editErrors.phone}</p>}
            </div>
            {editErrors.submit && <p className="text-sm text-red-600">{editErrors.submit}</p>}
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedEmployee?.isActive ? 'Deactivate' : 'Activate'} Employee?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedEmployee?.isActive ? 'deactivate' : 'activate'}{' '}
              {selectedEmployee?.name}?
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
