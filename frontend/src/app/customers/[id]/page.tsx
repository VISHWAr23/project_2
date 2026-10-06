// User instruction: "9. Customers (/customers, /customers/[id]): Customer directory (Search, Filter by status/employee, Pagination, Customer cards/table with name, business name, phone, address, assigned employee, status), Customer detail (Customer profile, Visit history timeline, Orders list, Total revenue from customer, Quick action to log a visit or create order)."
// Importers/callers: Next.js App Router (/customers/[id]), AppShell
// Affected API: GET /api/customers/:id, PATCH /api/customers/:id, GET /api/customers/:customerId/visits, POST /api/visits, GET /api/employees
// Data schemas: Customer, UpdateCustomerPayload, Visit, CreateVisitPayload, RecordVisitFormValues

'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { customersApi } from '@/lib/api/customers';
import { employeesApi } from '@/lib/api/employees';
import { visitsApi } from '@/lib/api/visits';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Save,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Navigation,
  Building,
  Phone,
  UserCheck,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { UpdateCustomerPayload } from '@/types/customer.types';
import { formatDate } from '@/lib/format';

const recordVisitSchema = z
  .object({
    employee: z.string().optional(),
    visitDate: z.string().min(1, 'Visit date is required'),
    purpose: z.string().trim().min(1, 'Purpose is required'),
    notes: z.string().trim().optional(),
    result: z.string().trim().min(1, 'Result is required'),
    followUpDate: z.string().optional(),
    latitude: z.coerce
      .number()
      .min(-90, 'Latitude must be >= -90')
      .max(90, 'Latitude must be <= 90')
      .optional()
      .or(z.literal('')),
    longitude: z.coerce
      .number()
      .min(-180, 'Longitude must be >= -180')
      .max(180, 'Longitude must be <= 180')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      if (!data.followUpDate || !data.visitDate) return true;
      return new Date(data.followUpDate) >= new Date(data.visitDate);
    },
    {
      message: 'Follow-up date cannot be earlier than visit date',
      path: ['followUpDate'],
    }
  );

type RecordVisitFormValues = z.infer<typeof recordVisitSchema>;

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [form, setForm] = useState<UpdateCustomerPayload>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  const {
    data: customer,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['customer', resolvedParams.id],
    queryFn: () => customersApi.getById(resolvedParams.id),
    enabled: !!user && !!resolvedParams.id,
    staleTime: 0,
  });

  const { data: visits, isLoading: visitsLoading } = useQuery({
    queryKey: ['customer-visits', resolvedParams.id],
    queryFn: () => visitsApi.getByCustomer(resolvedParams.id),
    enabled: !!user && !!resolvedParams.id,
    staleTime: 0,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ limit: 100, isActive: true }),
    enabled: !!user && isAdmin,
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset: resetRecordForm,
    formState: { errors: formErrors },
  } = useForm<RecordVisitFormValues>({
    resolver: zodResolver(recordVisitSchema) as any,
    defaultValues: {
      visitDate: new Date().toISOString().slice(0, 16),
      employee: '',
      purpose: '',
      notes: '',
      result: '',
      followUpDate: '',
      latitude: '',
      longitude: '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCustomerPayload) =>
      customersApi.update(resolvedParams.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setForm({});
      setErrors({});
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || 'Failed to update customer';
      setErrors({ submit: msg });
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: (values: RecordVisitFormValues) => {
      return visitsApi.create({
        customer: resolvedParams.id,
        employee: isAdmin && values.employee ? values.employee : undefined,
        visitDate: new Date(values.visitDate).toISOString(),
        purpose: values.purpose,
        notes: values.notes || undefined,
        result: values.result,
        followUpDate: values.followUpDate
          ? new Date(values.followUpDate).toISOString()
          : undefined,
        latitude: typeof values.latitude === 'number' ? values.latitude : undefined,
        longitude: typeof values.longitude === 'number' ? values.longitude : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-visits', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      setRecordModalOpen(false);
      resetRecordForm();
      setRecordError(null);
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || 'Failed to record visit';
      setRecordError(msg);
    },
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.customerName !== undefined && !form.customerName.trim())
      errs.customerName = 'Customer name cannot be empty';
    if (form.businessName !== undefined && !form.businessName.trim())
      errs.businessName = 'Business name cannot be empty';
    if (form.phone !== undefined && !form.phone.trim())
      errs.phone = 'Phone cannot be empty';
    if (form.address !== undefined && !form.address.trim())
      errs.address = 'Address cannot be empty';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate() || Object.keys(form).length === 0) return;
    updateMutation.mutate(form);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', Number(position.coords.latitude.toFixed(6)));
        setValue('longitude', Number(position.coords.longitude.toFixed(6)));
        setIsLocating(false);
      },
      (geoErr) => {
        setIsLocating(false);
        alert(`Failed to retrieve location: ${geoErr.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const onSubmitVisit = (data: RecordVisitFormValues) => {
    setRecordError(null);
    createVisitMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border text-center space-y-3">
        <RefreshCw className="size-8 animate-spin text-primary" />
        <p className="font-semibold text-foreground">Loading customer profile...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <EmptyState
        icon={Building}
        title="Customer Not Found"
        description="The customer account could not be found or you do not have permission to view it."
        action={{
          label: 'Back to Customers',
          onClick: () => router.push('/customers'),
        }}
      />
    );
  }

  const hasFormChanges = Object.keys(form).length > 0;

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb navigation */}
      <PageHeader
        title={customer.customerName}
        subtitle={customer.businessName}
        backHref="/customers"
        badge={<StatusBadge status={customer.status} />}
      >
        <Button
          onClick={() => {
            resetRecordForm();
            setRecordError(null);
            setRecordModalOpen(true);
          }}
          className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          <Plus className="size-4" />
          <span>Log Field Visit</span>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Edit Profile & Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground text-sm font-heading">
                    Customer & Business Profile
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Update core account credentials, addresses, and representative assignments.
                  </CardDescription>
                </div>
                <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                  {customer.customerName.slice(0, 2).toUpperCase()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName" className="text-xs text-foreground">
                    Contact / Person Name
                  </Label>
                  <Input
                    id="customerName"
                    value={
                      form.customerName !== undefined ? form.customerName : customer.customerName
                    }
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="mt-1.5 h-9 text-xs bg-background border-border"
                  />
                  {errors.customerName && (
                    <p className="mt-1 text-[11px] text-rose-400">{errors.customerName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="businessName" className="text-xs text-foreground">
                    Enterprise / Business Name
                  </Label>
                  <Input
                    id="businessName"
                    value={
                      form.businessName !== undefined ? form.businessName : customer.businessName
                    }
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className="mt-1.5 h-9 text-xs bg-background border-border"
                  />
                  {errors.businessName && (
                    <p className="mt-1 text-[11px] text-rose-400">{errors.businessName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-xs text-foreground">
                    Direct Contact Phone
                  </Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={form.phone !== undefined ? form.phone : customer.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="pl-9 h-9 text-xs bg-background border-border font-mono"
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-[11px] text-rose-400">{errors.phone}</p>
                  )}
                </div>

                {isAdmin ? (
                  <div>
                    <Label htmlFor="assignedEmployee" className="text-xs text-foreground">
                      Assigned Sales Representative
                    </Label>
                    <Select
                      value={
                        form.assignedEmployee !== undefined
                          ? form.assignedEmployee
                          : customer.assignedEmployee?._id || ''
                      }
                      onValueChange={(v: string) =>
                        setForm({ ...form, assignedEmployee: v })
                      }
                    >
                      <SelectTrigger
                        id="assignedEmployee"
                        className="mt-1.5 h-9 text-xs bg-background border-border"
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
                ) : (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Assigned Sales Representative
                    </Label>
                    <div className="mt-1.5 p-2 rounded-md bg-muted/40 border border-border text-xs flex items-center gap-2">
                      <UserCheck className="size-3.5 text-primary" />
                      <span className="font-medium text-foreground">
                        {customer.assignedEmployee?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="address" className="text-xs text-foreground">
                  Location / Delivery Address
                </Label>
                <div className="relative mt-1.5">
                  <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="address"
                    value={form.address !== undefined ? form.address : customer.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="pl-9 h-9 text-xs bg-background border-border"
                  />
                </div>
                {errors.address && (
                  <p className="mt-1 text-[11px] text-rose-400">{errors.address}</p>
                )}
              </div>

              {errors.submit && (
                <p className="text-xs text-rose-400 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                  {errors.submit}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setForm({});
                    setErrors({});
                  }}
                  disabled={!hasFormChanges || updateMutation.isPending}
                  className="gap-1 text-xs text-foreground"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reset</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasFormChanges || updateMutation.isPending}
                  className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                >
                  <Save className="size-3.5" />
                  <span>{updateMutation.isPending ? 'Saving...' : 'Save Profile'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Metadata & Account Summary */}
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Account Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Account Status</span>
                <StatusBadge status={customer.status} />
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Total Visits Logged</span>
                <span className="font-semibold text-foreground font-mono">
                  {visits?.length || 0}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Account Created</span>
                <span className="font-mono text-muted-foreground text-[11px]">
                  {formatDate(customer.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-mono text-muted-foreground text-[11px]">
                  {formatDate(customer.updatedAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Visit History Section */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="border-b border-border/60 p-4 sm:p-5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-heading font-semibold text-foreground">
              Customer Field Visit History
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Timeline of on-site visits, meetings, and outcome logs recorded for this account.
            </CardDescription>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold">
            {visits?.length || 0} Visits
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {visitsLoading && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading visit history...</p>
            </div>
          )}

          {!visitsLoading && (!visits || visits.length === 0) && (
            <div className="p-8">
              <EmptyState
                icon={Calendar}
                title="No visits recorded yet"
                description="No field interactions or customer consultations have been logged for this account."
                action={{
                  label: 'Log First Visit',
                  onClick: () => {
                    resetRecordForm();
                    setRecordError(null);
                    setRecordModalOpen(true);
                  },
                }}
              />
            </div>
          )}

          {!visitsLoading && visits && visits.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Visit Date & Time</th>
                    <th className="py-3 px-3">Representative</th>
                    <th className="py-3 px-3">Purpose & Notes</th>
                    <th className="py-3 px-3">Result / Outcome</th>
                    <th className="py-3 px-3">Follow-Up</th>
                    <th className="py-3 px-4 text-right">GPS Coordinates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {visits.map((visit) => (
                    <tr key={visit._id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Calendar className="size-3.5 text-primary/70" />
                          <span>{formatDate(visit.visitDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5 font-mono">
                          <Clock className="size-3 text-muted-foreground" />
                          <span>
                            {new Date(visit.visitDate).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-medium text-foreground">
                          {visit.employee?.name || 'Unassigned'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 max-w-xs">
                        <p className="font-medium text-foreground">{visit.purpose}</p>
                        {visit.notes && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {visit.notes}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-3 max-w-xs">
                        <span className="text-muted-foreground">{visit.result}</span>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {visit.followUpDate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                            <Calendar className="size-3" />
                            {formatDate(visit.followUpDate)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {visit.latitude !== undefined && visit.longitude !== undefined ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            <MapPin className="size-3 text-emerald-400" />
                            <span>
                              {visit.latitude.toFixed(4)}, {visit.longitude.toFixed(4)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-[11px]">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Visit for this Customer Dialog */}
      <Dialog open={recordModalOpen} onOpenChange={setRecordModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">
              Log Field Visit for {customer.customerName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record meeting notes, outcome, follow-up deadlines, and on-site GPS coordinates for{' '}
              {customer.businessName}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitVisit)} className="space-y-3.5 py-2 text-xs">
            {isAdmin && (
              <div>
                <Label htmlFor="modal-employee" className="text-foreground text-xs">
                  Field Executive (Optional)
                </Label>
                <Select
                  onValueChange={(v: string) =>
                    setValue('employee', v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger
                    id="modal-employee"
                    className="mt-1 h-9 text-xs bg-background border-border"
                  >
                    <SelectValue placeholder="Select executive" />
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

            <div>
              <Label htmlFor="modal-visitDate" className="text-foreground text-xs">
                Visit Date & Time <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="modal-visitDate"
                type="datetime-local"
                {...register('visitDate')}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {formErrors.visitDate && (
                <p className="mt-1 text-[11px] text-rose-400">
                  {formErrors.visitDate.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="modal-purpose" className="text-foreground text-xs">
                Purpose of Visit <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="modal-purpose"
                placeholder="e.g., Contract discussion, Product demo, Payment collection"
                {...register('purpose')}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {formErrors.purpose && (
                <p className="mt-1 text-[11px] text-rose-400">{formErrors.purpose.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="modal-result" className="text-foreground text-xs">
                Outcome / Result <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="modal-result"
                placeholder="e.g., Quotation requested, Agreed on pricing, Order finalized"
                {...register('result')}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {formErrors.result && (
                <p className="mt-1 text-[11px] text-rose-400">{formErrors.result.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="modal-notes" className="text-foreground text-xs">
                Detailed Discussion Notes (Optional)
              </Label>
              <Input
                id="modal-notes"
                placeholder="Key takeaways, customer requirements, constraints..."
                {...register('notes')}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
            </div>

            <div>
              <Label htmlFor="modal-followUpDate" className="text-foreground text-xs">
                Next Follow-up Date (Optional)
              </Label>
              <Input
                id="modal-followUpDate"
                type="datetime-local"
                {...register('followUpDate')}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {formErrors.followUpDate && (
                <p className="mt-1 text-[11px] text-rose-400">
                  {formErrors.followUpDate.message}
                </p>
              )}
            </div>

            {/* GPS Coordinates Section */}
            <div className="p-3 bg-muted/20 border border-border/80 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" />
                  GPS Verification (Optional)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocating}
                  className="h-7 text-[11px] gap-1 text-foreground"
                >
                  <Navigation className="size-3 text-primary" />
                  {isLocating ? 'Locating...' : 'Get Current GPS'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="modal-latitude" className="text-[11px] text-muted-foreground">
                    Latitude
                  </Label>
                  <Input
                    id="modal-latitude"
                    type="number"
                    step="any"
                    placeholder="e.g. 12.9716"
                    {...register('latitude')}
                    className="mt-1 h-8 text-xs bg-background border-border font-mono"
                  />
                  {formErrors.latitude && (
                    <p className="mt-1 text-[10px] text-rose-400">
                      {formErrors.latitude.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="modal-longitude" className="text-[11px] text-muted-foreground">
                    Longitude
                  </Label>
                  <Input
                    id="modal-longitude"
                    type="number"
                    step="any"
                    placeholder="e.g. 77.5946"
                    {...register('longitude')}
                    className="mt-1 h-8 text-xs bg-background border-border font-mono"
                  />
                  {formErrors.longitude && (
                    <p className="mt-1 text-[10px] text-rose-400">
                      {formErrors.longitude.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {recordError && (
              <p className="text-xs text-rose-400 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                {recordError}
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRecordModalOpen(false)}
                className="text-xs text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createVisitMutation.isPending}
                className="text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                {createVisitMutation.isPending ? 'Recording...' : 'Log Field Visit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
