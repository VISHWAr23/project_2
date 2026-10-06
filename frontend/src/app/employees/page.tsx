// User instruction: "10. Employees (/employees, /employees/[id]): Employee directory (Admin only: Search, Filter by role/status, Pagination, Employee table with name, email, role, phone, active status), Employee detail (Employee profile, Assigned customers list, Orders created by employee, Visits logged, Incentives earned, Edit employee, Toggle active status)."
// Importers/callers: Next.js App Router (/employees), AppShell, Sidebar navigation
// Affected API: GET /api/employees, POST /api/employees, PATCH /api/employees/:id, PATCH /api/employees/:id/status
// Data schemas: Employee, CreateEmployeePayload, UpdateEmployeePayload, EmployeeListResponse

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/lib/api/employees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatCard } from '@/components/ui/stat-card';
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
  Users,
  ShieldCheck,
  Phone,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import type {
  CreateEmployeePayload,
  UpdateEmployeePayload,
  Employee,
} from '@/types/employee.types';
import { formatDate } from '@/lib/format';

export default function EmployeesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

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

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['employees', page, search, statusFilter],
    queryFn: () =>
      employeesApi.list({
        page,
        limit,
        search: search || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      }),
    enabled: !!user && isAdmin,
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (!isAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Admin Access Required"
        description="The team directory and employee management settings are restricted to administrative accounts."
        action={{
          label: 'Go to Dashboard',
          onClick: () => router.push('/dashboard'),
        }}
      />
    );
  }

  const totalEmployees = data?.total || 0;
  const activeCount = data?.items?.filter((e) => e.isActive).length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & Employees"
        subtitle="Manage sales executives, field personnel, permissions, and operational status."
      >
        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          <Plus className="size-4" />
          <span>Add Employee</span>
        </Button>
      </PageHeader>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Personnel"
          value={totalEmployees}
          icon={Users}
          description="Registered team members"
        />
        <StatCard
          title="Active On-Field Staff"
          value={activeCount}
          icon={UserCheck}
          description="Active accounts in current view"
        />
        <StatCard
          title="Admin & Leadership"
          value={data?.items?.filter((e) => e.role === 'ADMIN').length || 0}
          icon={ShieldCheck}
          description="Privileged administrators"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search staff by name, email, or direct phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs bg-background border-border"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onValueChange={(v: 'all' | 'active' | 'inactive') => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger id="status" className="h-9 text-xs bg-background border-border">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Personnel</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <Card className="bg-card border-border overflow-hidden">
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <RefreshCw className="size-8 animate-spin text-primary" />
            <p className="font-semibold text-foreground text-sm">Loading staff directory...</p>
          </div>
        )}

        {error && (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title="Failed to Load Employees"
              description="Could not synchronize employee list. Please check your network connection."
              action={{
                label: 'Retry',
                onClick: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
              }}
            />
          </div>
        )}

        {!isLoading && !error && data && data.items.length === 0 && (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title="No Employees Found"
              description={
                search || statusFilter !== 'all'
                  ? 'No employees match your active filter criteria. Try adjusting your search query.'
                  : 'Start onboarding your field sales executives and team members.'
              }
              action={{
                label: 'Add First Employee',
                onClick: () => setCreateOpen(true),
              }}
            />
          </div>
        )}

        {!isLoading && !error && data && data.items.length > 0 && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Contact Information</th>
                    <th className="py-3 px-3">Account Status</th>
                    <th className="py-3 px-3">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.items.map((emp) => (
                    <tr
                      key={emp._id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/employees/${emp._id}`)}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                              {emp.name}
                              <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono">{emp.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {emp.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <ShieldCheck className="size-3" />
                            Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            <Users className="size-3" />
                            Field Executive
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-foreground font-mono text-[11px]">
                            <Phone className="size-3 text-muted-foreground" />
                            <span>{emp.phone || '—'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <StatusBadge status={emp.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        {formatDate(emp.createdAt)}
                      </td>

                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEdit(emp)}
                            className="size-7 text-muted-foreground hover:text-foreground"
                            title="Edit Employee"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openConfirm(emp)}
                            className={
                              emp.isActive
                                ? 'size-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                                : 'size-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                            }
                            title={emp.isActive ? 'Deactivate Employee' : 'Activate Employee'}
                          >
                            {emp.isActive ? (
                              <UserX className="size-3.5" />
                            ) : (
                              <UserCheck className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Showing page <span className="font-semibold text-foreground">{data.page}</span> of{' '}
                  <span className="font-semibold text-foreground">{data.totalPages}</span> ({data.total} total staff)
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1 || isFetching}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    className="h-8 gap-1 text-xs text-foreground"
                  >
                    <ChevronLeft className="size-3.5" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === data.totalPages || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 gap-1 text-xs text-foreground"
                  >
                    Next
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Create Employee Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">Add New Employee</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create an account for a new sales executive or field representative.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <Label htmlFor="create-name" className="text-xs text-foreground">
                Full Name <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="create-name"
                placeholder="e.g. Rajesh Kumar"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {createErrors.name && (
                <p className="mt-1 text-[11px] text-rose-400">{createErrors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="create-email" className="text-xs text-foreground">
                Work Email <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="create-email"
                type="email"
                placeholder="rajesh@lathikka.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="mt-1 h-9 text-xs bg-background border-border font-mono"
              />
              {createErrors.email && (
                <p className="mt-1 text-[11px] text-rose-400">{createErrors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="create-phone" className="text-xs text-foreground">
                Direct Contact Phone <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="create-phone"
                placeholder="+91 98765 43210"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="mt-1 h-9 text-xs bg-background border-border font-mono"
              />
              {createErrors.phone && (
                <p className="mt-1 text-[11px] text-rose-400">{createErrors.phone}</p>
              )}
            </div>

            <div>
              <Label htmlFor="create-password" className="text-xs text-foreground">
                Initial Password <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Minimum 6 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {createErrors.password && (
                <p className="mt-1 text-[11px] text-rose-400">{createErrors.password}</p>
              )}
            </div>

            {createErrors.submit && (
              <p className="text-xs text-rose-400 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                {createErrors.submit}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
              {createMutation.isPending ? 'Creating Account...' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">Edit Employee Profile</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update credentials and contact details for {selectedEmployee?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <Label htmlFor="edit-name" className="text-xs text-foreground">
                Full Name
              </Label>
              <Input
                id="edit-name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {editErrors.name && (
                <p className="mt-1 text-[11px] text-rose-400">{editErrors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-email" className="text-xs text-foreground">
                Work Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="mt-1 h-9 text-xs bg-background border-border font-mono"
              />
              {editErrors.email && (
                <p className="mt-1 text-[11px] text-rose-400">{editErrors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-phone" className="text-xs text-foreground">
                Phone Number
              </Label>
              <Input
                id="edit-phone"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="mt-1 h-9 text-xs bg-background border-border font-mono"
              />
              {editErrors.phone && (
                <p className="mt-1 text-[11px] text-rose-400">{editErrors.phone}</p>
              )}
            </div>

            {editErrors.submit && (
              <p className="text-xs text-rose-400 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                {editErrors.submit}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Activate Confirmation Alert */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-heading">
              {selectedEmployee?.isActive ? 'Deactivate' : 'Activate'} Employee?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to {selectedEmployee?.isActive ? 'deactivate' : 'activate'}{' '}
              <strong className="text-foreground">{selectedEmployee?.name}</strong>?{' '}
              {selectedEmployee?.isActive
                ? 'They will temporarily lose access to log field visits, record orders, and manage claims.'
                : 'They will regain immediate access to on-field and order logging workflows.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusToggle}
              disabled={statusMutation.isPending}
              className={
                selectedEmployee?.isActive
                  ? 'text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold'
                  : 'text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'
              }
            >
              {statusMutation.isPending
                ? 'Processing...'
                : selectedEmployee?.isActive
                ? 'Deactivate Staff'
                : 'Activate Staff'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
