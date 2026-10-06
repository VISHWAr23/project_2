// User instruction: "NOW I ONLY WANT TWO THINGS: 1. Make the ENTIRE APPLICATION fully responsive and mobile-friendly. 2. Add a proper Light Theme + Dark Theme with a theme switcher."
// Importers/callers: Next.js App Router (/employees/[id]), /employees directory links
// Affected API: GET /api/employees/:id, PATCH /api/employees/:id, PATCH /api/employees/:id/status, GET /api/customers, GET /api/orders, GET /api/visits, GET /api/incentives
// Data schemas: Employee, UpdateEmployeePayload, Customer, Order, Visit, Incentive

'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/lib/api/employees';
import { customersApi } from '@/lib/api/customers';
import { ordersApi } from '@/lib/api/orders';
import { visitsApi } from '@/lib/api/visits';
import { incentivesApi } from '@/lib/api/incentives';
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
  Save,
  Users,
  ShoppingBag,
  MapPin,
  TrendingUp,
  ShieldCheck,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
  Clock,
  RefreshCw,
  Building2,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import type { UpdateEmployeePayload } from '@/types/employee.types';
import { formatDate, formatCurrency } from '@/lib/format';

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'profile' | 'customers' | 'orders' | 'visits' | 'incentives'>('profile');
  const [form, setForm] = useState<UpdateEmployeePayload>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);

  // 1. Employee Profile Query
  const {
    data: employee,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['employee', resolvedParams.id],
    queryFn: () => employeesApi.getById(resolvedParams.id),
    enabled: !!user && !!resolvedParams.id,
    staleTime: 0,
  });

  // 2. Linked Customers Query
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'employee', resolvedParams.id],
    queryFn: () => customersApi.list({ limit: 100 }),
    enabled: !!user && !!resolvedParams.id,
  });

  // 3. Linked Orders Query
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'employee', resolvedParams.id],
    queryFn: () => ordersApi.list({ limit: 50 }),
    enabled: !!user && !!resolvedParams.id,
  });

  // 4. Linked Visits Query
  const { data: visitsData } = useQuery({
    queryKey: ['visits', 'employee', resolvedParams.id],
    queryFn: () => visitsApi.list({ limit: 50 }),
    enabled: !!user && !!resolvedParams.id,
  });

  // 5. Linked Incentives Query
  const { data: incentivesData } = useQuery({
    queryKey: ['incentives', 'employee', resolvedParams.id],
    queryFn: () => incentivesApi.list({ limit: 50, employeeId: resolvedParams.id }),
    enabled: !!user && !!resolvedParams.id,
  });

  // Filter linked items
  const assignedCustomers =
    customersData?.items?.filter(
      (c) =>
        c.assignedEmployee?._id === resolvedParams.id ||
        (typeof c.assignedEmployee === 'string' && c.assignedEmployee === resolvedParams.id)
    ) || [];

  const employeeOrders =
    ordersData?.items?.filter(
      (o) =>
        o.employee?._id === resolvedParams.id ||
        (typeof o.employee === 'string' && o.employee === resolvedParams.id)
    ) || [];

  const employeeVisits =
    visitsData?.items?.filter(
      (v) =>
        v.employee?._id === resolvedParams.id ||
        (typeof v.employee === 'string' && v.employee === resolvedParams.id)
    ) || [];

  const employeeIncentives = incentivesData?.items || [];

  const totalIncentivesEarned = employeeIncentives.reduce((acc, inc) => {
    return acc + (inc.incentiveAmount || 0);
  }, 0);

  const totalSalesRevenue = employeeOrders.reduce((acc, ord) => {
    return acc + (ord.totalAmount || 0);
  }, 0);

  // Update Profile Mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateEmployeePayload) =>
      employeesApi.update(resolvedParams.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setForm({});
      setErrors({});
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || 'Failed to update employee';
      setErrors({ submit: msg });
    },
  });

  // Toggle Active Status Mutation
  const statusMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      employeesApi.updateStatus(resolvedParams.id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setStatusConfirmOpen(false);
    },
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.name !== undefined && !form.name.trim()) errs.name = 'Name cannot be empty';
    if (form.email !== undefined && !form.email.trim()) errs.email = 'Email cannot be empty';
    if (form.phone !== undefined && !form.phone.trim()) errs.phone = 'Phone cannot be empty';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate() || Object.keys(form).length === 0) return;
    updateMutation.mutate(form);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
        <RefreshCw className="size-8 animate-spin text-primary" />
        <p className="font-semibold text-foreground text-sm">Loading employee profile...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <EmptyState
        icon={Users}
        title="Employee Profile Not Found"
        description="The requested employee record does not exist or you do not have administrative permissions to view it."
        action={{
          label: 'Back to Employees',
          onClick: () => router.push('/employees'),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Header */}
      <PageHeader
        title={employee.name}
        subtitle={`Member since ${formatDate(employee.createdAt)} • Role: ${employee.role}`}
        backHref="/employees"
      >
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusConfirmOpen(true)}
              className={
                employee.isActive
                  ? 'gap-1.5 text-xs text-rose-400 border-rose-500/20 hover:bg-rose-500/10'
                  : 'gap-1.5 text-xs text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
              }
            >
              {employee.isActive ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
              <span>{employee.isActive ? 'Deactivate Account' : 'Activate Account'}</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending || Object.keys(form).length === 0}
            className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
          >
            <Save className="size-3.5" />
            <span>{updateMutation.isPending ? 'Saving...' : 'Save Profile Changes'}</span>
          </Button>
        </div>
      </PageHeader>

      {/* Profile Summary Banner */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0 font-heading">
              {getInitials(employee.name)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-foreground font-heading">{employee.name}</h2>
                <StatusBadge status={employee.isActive ? 'ACTIVE' : 'INACTIVE'} />
                {employee.role === 'ADMIN' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <ShieldCheck className="size-3.5" />
                    Administrator
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Users className="size-3.5" />
                    Field Executive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap font-mono">
                <span className="flex items-center gap-1">
                  <Mail className="size-3 text-muted-foreground" />
                  {employee.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="size-3 text-muted-foreground" />
                  {employee.phone || 'No phone recorded'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Direct Revenue Generated
              </p>
              <p className="text-lg font-bold text-foreground font-mono">
                {formatCurrency(totalSalesRevenue)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Assigned Accounts"
          value={assignedCustomers.length}
          icon={Building2}
          description="Customer accounts"
        />
        <StatCard
          title="Orders Logged"
          value={employeeOrders.length}
          icon={ShoppingBag}
          description="Total sale orders"
        />
        <StatCard
          title="Field Visits Logged"
          value={employeeVisits.length}
          icon={MapPin}
          description="Client checkpoints"
        />
        <StatCard
          title="Incentives Earned"
          value={<CurrencyDisplay amount={totalIncentivesEarned} />}
          icon={TrendingUp}
          description="Performance bonuses"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto text-xs">
        <Button
          variant={activeTab === 'profile' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('profile')}
          className="gap-1.5 text-xs text-foreground font-medium rounded-lg"
        >
          <ShieldCheck className="size-3.5" />
          <span>Profile & Security</span>
        </Button>

        <Button
          variant={activeTab === 'customers' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('customers')}
          className="gap-1.5 text-xs text-foreground font-medium rounded-lg"
        >
          <Building2 className="size-3.5" />
          <span>Assigned Customers ({assignedCustomers.length})</span>
        </Button>

        <Button
          variant={activeTab === 'orders' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('orders')}
          className="gap-1.5 text-xs text-foreground font-medium rounded-lg"
        >
          <ShoppingBag className="size-3.5" />
          <span>Orders & Invoices ({employeeOrders.length})</span>
        </Button>

        <Button
          variant={activeTab === 'visits' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('visits')}
          className="gap-1.5 text-xs text-foreground font-medium rounded-lg"
        >
          <MapPin className="size-3.5" />
          <span>Field Visits ({employeeVisits.length})</span>
        </Button>

        <Button
          variant={activeTab === 'incentives' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('incentives')}
          className="gap-1.5 text-xs text-foreground font-medium rounded-lg"
        >
          <DollarSign className="size-3.5" />
          <span>Commission & Incentives ({employeeIncentives.length})</span>
        </Button>
      </div>

      {/* Tab 1: Profile & Settings */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 bg-card border-border">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground font-heading">
                Editable Profile Details
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Update the official name, corporate email address, and active telephone for this employee.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-2 space-y-4 text-xs">
              <div>
                <Label htmlFor="name" className="text-xs text-foreground">
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={form.name !== undefined ? form.name : employee.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 h-9 text-xs bg-background border-border"
                />
                {errors.name && <p className="mt-1 text-[11px] text-rose-400">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="email" className="text-xs text-foreground">
                  Work Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email !== undefined ? form.email : employee.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 h-9 text-xs bg-background border-border font-mono"
                />
                {errors.email && <p className="mt-1 text-[11px] text-rose-400">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="phone" className="text-xs text-foreground">
                  Direct Phone Number
                </Label>
                <Input
                  id="phone"
                  value={form.phone !== undefined ? form.phone : employee.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 h-9 text-xs bg-background border-border font-mono"
                />
                {errors.phone && <p className="mt-1 text-[11px] text-rose-400">{errors.phone}</p>}
              </div>

              {errors.submit && (
                <p className="text-xs text-rose-400 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                  {errors.submit}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setForm({});
                    setErrors({});
                  }}
                  className="text-xs text-foreground"
                  disabled={Object.keys(form).length === 0}
                >
                  Discard Changes
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateMutation.isPending || Object.keys(form).length === 0}
                  className="text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground font-heading">
                Audit & System Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-2 space-y-3.5 text-xs">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                  Internal ID
                </p>
                <p className="mt-0.5 text-foreground font-mono text-[11px]">{employee._id}</p>
              </div>

              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                  System Role
                </p>
                <p className="mt-0.5 text-foreground font-semibold">
                  {employee.role === 'ADMIN' ? 'Full Administrator' : 'Field Sales Representative'}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                  Account Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={employee.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-3.5" />
                  <span>Created {formatDate(employee.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-3.5" />
                  <span>Last Modified {formatDate(employee.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Assigned Customers */}
      {activeTab === 'customers' && (
        <Card className="bg-card border-border overflow-hidden">
          {assignedCustomers.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Building2}
                title="No Customers Assigned"
                description="This employee currently has no accounts assigned in their territory."
                action={{
                  label: 'View All Customers',
                  onClick: () => router.push('/customers'),
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Account Code</th>
                    <th className="py-3 px-3">Business Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {assignedCustomers.map((cust) => (
                    <tr
                      key={cust._id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/customers/${cust._id}`)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        {cust._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3 px-3 font-semibold text-foreground">
                        {cust.customerName || cust.businessName}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {cust.businessName || 'Business'}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        {cust.phone || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={cust.status || 'ACTIVE'} />
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => router.push(`/customers/${cust._id}`)}
                          className="size-7 text-muted-foreground hover:text-foreground"
                          title="Open Customer Profile"
                        >
                          <ExternalLink className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Orders Created */}
      {activeTab === 'orders' && (
        <Card className="bg-card border-border overflow-hidden">
          {employeeOrders.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ShoppingBag}
                title="No Orders Logged"
                description="This sales executive has not booked any commercial orders yet."
                action={{
                  label: 'View Orders Hub',
                  onClick: () => router.push('/orders'),
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Order Number</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Order Total</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Order Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {employeeOrders.map((ord) => (
                    <tr
                      key={ord._id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/orders/${ord._id}`)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        {ord._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3 px-3 font-semibold text-foreground">
                        {typeof ord.customer === 'object' ? ord.customer?.customerName || ord.customer?.businessName : 'Customer'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-foreground">
                        <CurrencyDisplay amount={ord.totalAmount} />
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={ord.status} />
                      </td>
                      <td className="py-3 px-3 text-muted-foreground font-mono">
                        {formatDate(ord.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => router.push(`/orders/${ord._id}`)}
                          className="size-7 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Field Visits */}
      {activeTab === 'visits' && (
        <Card className="bg-card border-border overflow-hidden">
          {employeeVisits.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={MapPin}
                title="No Visits Recorded"
                description="No client visits or GPS check-in logs found for this representative."
                action={{
                  label: 'View Field Activity',
                  onClick: () => router.push('/visits'),
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Account / Location</th>
                    <th className="py-3 px-3">Purpose</th>
                    <th className="py-3 px-3">Check In Time</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Outcome / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {employeeVisits.map((vis) => (
                    <tr key={vis._id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {typeof vis.customer === 'object' ? vis.customer?.customerName || vis.customer?.businessName : 'Customer'}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {vis.purpose || 'Routine Sales Visit'}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        {formatDate(vis.visitDate || vis.createdAt)}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status="COMPLETED" />
                      </td>
                      <td className="py-3 px-3 text-muted-foreground truncate max-w-xs">
                        {vis.result || vis.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 5: Incentives */}
      {activeTab === 'incentives' && (
        <Card className="bg-card border-border overflow-hidden">
          {employeeIncentives.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={TrendingUp}
                title="No Incentives Calculated"
                description="No commission or quarterly performance records generated yet."
                action={{
                  label: 'View Incentives Hub',
                  onClick: () => router.push('/incentives'),
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Period / Cycle</th>
                    <th className="py-3 px-3">Sales Target</th>
                    <th className="py-3 px-3">Achieved Sales</th>
                    <th className="py-3 px-3">Commission Earned</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {employeeIncentives.map((inc) => (
                    <tr
                      key={inc._id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/incentives/${inc._id}`)}
                    >
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {formatDate(inc.createdAt)}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        <CurrencyDisplay amount={inc.orderAmount || 0} />
                      </td>
                      <td className="py-3 px-3 font-mono text-foreground font-semibold">
                        <CurrencyDisplay amount={inc.orderAmount || 0} />
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        <CurrencyDisplay amount={inc.incentiveAmount || 0} />
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={inc.status || 'PENDING'} />
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => router.push(`/incentives/${inc._id}`)}
                          className="size-7 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Confirmation Dialog for Status Toggle */}
      <AlertDialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-heading">
              {employee.isActive ? 'Deactivate' : 'Activate'} Employee?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to {employee.isActive ? 'deactivate' : 'activate'}{' '}
              <strong className="text-foreground">{employee.name}</strong>?
              {employee.isActive
                ? ' They will not be able to log in or create new visits and orders.'
                : ' They will regain full access to their assigned operational dashboard.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusMutation.mutate(!employee.isActive)}
              disabled={statusMutation.isPending}
              className={
                employee.isActive
                  ? 'text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold'
                  : 'text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'
              }
            >
              {statusMutation.isPending
                ? 'Processing...'
                : employee.isActive
                ? 'Deactivate'
                : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
