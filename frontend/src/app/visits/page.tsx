// User instruction: "Phase 5: Customer Visit Management - Create Visits Management UI"
// Importers/callers: Next.js App Router
// Affected API: /api/visits endpoints (list, create, update), /api/customers, /api/employees
// Data schemas: Visit, CreateVisitPayload, UpdateVisitPayload, VisitListResponse, VisitQueryParams

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { visitsApi } from '@/lib/api/visits';
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
import { Plus, Edit2, MapPin, Calendar, Clock, Navigation } from 'lucide-react';
import type { Visit } from '@/types/visit.types';

const createVisitSchema = z.object({
  customer: z.string().min(1, 'Customer is required'),
  employee: z.string().optional(),
  visitDate: z.string().min(1, 'Visit date is required'),
  purpose: z.string().trim().min(1, 'Purpose is required'),
  notes: z.string().trim().optional(),
  result: z.string().trim().min(1, 'Result is required'),
  followUpDate: z.string().optional(),
  photoUrl: z.string().trim().optional(),
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
}).refine(
  (data) => {
    if (!data.followUpDate || !data.visitDate) return true;
    return new Date(data.followUpDate) >= new Date(data.visitDate);
  },
  {
    message: 'Follow-up date cannot be earlier than visit date',
    path: ['followUpDate'],
  },
);

type CreateVisitFormValues = z.infer<typeof createVisitSchema>;

export default function VisitsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [page, setPage] = useState(1);
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [editForm, setEditForm] = useState<{
    visitDate?: string;
    purpose?: string;
    notes?: string;
    result?: string;
    followUpDate?: string;
    latitude?: number | '';
    longitude?: number | '';
  }>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isLocating, setIsLocating] = useState(false);

  const limit = 10;

  const {
    register,
    handleSubmit,
    setValue,
    reset: resetCreateForm,
    formState: { errors: formErrors },
  } = useForm<CreateVisitFormValues>({
    resolver: zodResolver(createVisitSchema) as any,
    defaultValues: {
      visitDate: new Date().toISOString().slice(0, 16),
      customer: '',
      employee: '',
      purpose: '',
      notes: '',
      result: '',
      followUpDate: '',
      photoUrl: '',
      latitude: '',
      longitude: '',
    },
  });

  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load customers for selection and filtering
  const { data: customersData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customersApi.list({ limit: 100, status: 'ACTIVE' }),
  });

  // Load employees for ADMIN selection and filtering
  const { data: employeesData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ limit: 100, isActive: true }),
    enabled: isAdmin,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['visits', page, employeeFilter, customerFilter, startDate, endDate],
    queryFn: () =>
      visitsApi.list({
        page,
        limit,
        employeeId: isAdmin && employeeFilter !== 'all' ? employeeFilter : undefined,
        customerId: customerFilter !== 'all' ? customerFilter : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateVisitFormValues) => {
      return visitsApi.create({
        customer: values.customer,
        employee: isAdmin && values.employee ? values.employee : undefined,
        visitDate: new Date(values.visitDate).toISOString(),
        purpose: values.purpose,
        notes: values.notes || undefined,
        result: values.result,
        followUpDate: values.followUpDate ? new Date(values.followUpDate).toISOString() : undefined,
        photoUrl: values.photoUrl || undefined,
        latitude: typeof values.latitude === 'number' ? values.latitude : undefined,
        longitude: typeof values.longitude === 'number' ? values.longitude : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      setCreateOpen(false);
      resetCreateForm();
      setSubmitError(null);
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || 'Failed to record visit';
      setSubmitError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      visitsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      setEditOpen(false);
      setSelectedVisit(null);
      setEditForm({});
      setEditErrors({});
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || 'Failed to update visit';
      setEditErrors({ submit: msg });
    },
  });

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
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const onSubmitCreate = (data: CreateVisitFormValues) => {
    setSubmitError(null);
    createMutation.mutate(data);
  };

  const openEdit = (visit: Visit) => {
    setSelectedVisit(visit);
    setEditForm({
      visitDate: visit.visitDate ? new Date(visit.visitDate).toISOString().slice(0, 16) : '',
      purpose: visit.purpose,
      notes: visit.notes || '',
      result: visit.result,
      followUpDate: visit.followUpDate ? new Date(visit.followUpDate).toISOString().slice(0, 16) : '',
      latitude: visit.latitude !== undefined ? visit.latitude : '',
      longitude: visit.longitude !== undefined ? visit.longitude : '',
    });
    setEditErrors({});
    setEditOpen(true);
  };

  const handleEditSave = () => {
    if (!selectedVisit) return;
    const errors: Record<string, string> = {};
    if (editForm.purpose !== undefined && !editForm.purpose.trim()) {
      errors.purpose = 'Purpose cannot be empty';
    }
    if (editForm.result !== undefined && !editForm.result.trim()) {
      errors.result = 'Result cannot be empty';
    }
    if (editForm.visitDate && editForm.followUpDate) {
      if (new Date(editForm.followUpDate) < new Date(editForm.visitDate)) {
        errors.followUpDate = 'Follow-up date cannot be earlier than visit date';
      }
    }
    if (editForm.latitude !== undefined && editForm.latitude !== '') {
      const lat = Number(editForm.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.latitude = 'Latitude must be between -90 and 90';
      }
    }
    if (editForm.longitude !== undefined && editForm.longitude !== '') {
      const lng = Number(editForm.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.longitude = 'Longitude must be between -180 and 180';
      }
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    const payload: any = {};
    if (editForm.visitDate) payload.visitDate = new Date(editForm.visitDate).toISOString();
    if (editForm.purpose !== undefined) payload.purpose = editForm.purpose;
    if (editForm.notes !== undefined) payload.notes = editForm.notes;
    if (editForm.result !== undefined) payload.result = editForm.result;
    if (editForm.followUpDate !== undefined) {
      payload.followUpDate = editForm.followUpDate ? new Date(editForm.followUpDate).toISOString() : undefined;
    }
    if (editForm.latitude !== undefined && editForm.latitude !== '') payload.latitude = Number(editForm.latitude);
    if (editForm.longitude !== undefined && editForm.longitude !== '') payload.longitude = Number(editForm.longitude);

    updateMutation.mutate({ id: selectedVisit._id, payload });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isAdmin ? 'Visit Management' : 'My Customer Visits'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isAdmin
                ? 'Track and monitor field visits recorded by all representatives'
                : 'Log and review interactions with your assigned clients'}
            </p>
          </div>
          <Button
            onClick={() => {
              resetCreateForm();
              setSubmitError(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Record Visit
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {isAdmin && (
                <div>
                  <Label htmlFor="employeeFilter">Employee</Label>
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

              <div>
                <Label htmlFor="customerFilter">Customer</Label>
                <Select
                  value={customerFilter}
                  onValueChange={(v: string) => {
                    setCustomerFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="customerFilter">
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customersData?.items?.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.customerName} ({c.businessName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">From Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div>
                <Label htmlFor="endDate">To Date</Label>
                <Input
                  id="endDate"
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

        {isLoading && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Loading visits...
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="py-12 text-center text-red-600">
              Failed to load visits. Please check your network or permissions.
            </CardContent>
          </Card>
        )}

        {data && data.items.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No visits found. Click &quot;Record Visit&quot; to log a new client visit.
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
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Purpose
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Outcome / Result
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Follow-Up
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Location / GPS
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {data.items.map((visit) => (
                      <tr key={visit._id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {new Date(visit.visitDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {new Date(visit.visitDate).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <p className="font-semibold text-gray-900">
                            {visit.customer?.customerName || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {visit.customer?.businessName || ''}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          <p className="font-medium text-gray-800">
                            {visit.employee?.name || 'Unassigned'}
                          </p>
                          <p className="text-xs text-gray-500">{visit.employee?.email}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {visit.purpose}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {visit.result}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {visit.followUpDate ? (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                              {new Date(visit.followUpDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500">
                          {visit.latitude !== undefined && visit.longitude !== undefined ? (
                            <div className="flex items-center gap-1 text-emerald-600">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>
                                {visit.latitude.toFixed(4)}, {visit.longitude.toFixed(4)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not recorded</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(visit)}
                            >
                              <Edit2 className="h-4 w-4" />
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

      {/* Record Visit Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Customer Visit</DialogTitle>
            <DialogDescription>Log an interaction or meeting with a client</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-4">
            <div>
              <Label htmlFor="customer">Customer</Label>
              <Select
                onValueChange={(v: string) => setValue('customer', v, { shouldValidate: true })}
              >
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customersData?.items?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.customerName} ({c.businessName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.customer && (
                <p className="mt-1 text-sm text-red-600">{formErrors.customer.message}</p>
              )}
            </div>

            {isAdmin && (
              <div>
                <Label htmlFor="employee">Assign Field Employee (Optional)</Label>
                <Select
                  onValueChange={(v: string) => setValue('employee', v, { shouldValidate: true })}
                >
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="Select assigned employee" />
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
              <Label htmlFor="visitDate">Visit Date & Time</Label>
              <Input
                id="visitDate"
                type="datetime-local"
                {...register('visitDate')}
              />
              {formErrors.visitDate && (
                <p className="mt-1 text-sm text-red-600">{formErrors.visitDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="purpose">Purpose of Visit</Label>
              <Input
                id="purpose"
                placeholder="e.g., Product demonstration, Catalog update"
                {...register('purpose')}
              />
              {formErrors.purpose && (
                <p className="mt-1 text-sm text-red-600">{formErrors.purpose.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="result">Result / Outcome</Label>
              <Input
                id="result"
                placeholder="e.g., Client requested quotation for 500 units"
                {...register('result')}
              />
              {formErrors.result && (
                <p className="mt-1 text-sm text-red-600">{formErrors.result.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Detailed Meeting Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Additional notes, key discussion points"
                {...register('notes')}
              />
            </div>

            <div>
              <Label htmlFor="followUpDate">Next Follow-up Date (Optional)</Label>
              <Input
                id="followUpDate"
                type="datetime-local"
                {...register('followUpDate')}
              />
              {formErrors.followUpDate && (
                <p className="mt-1 text-sm text-red-600">{formErrors.followUpDate.message}</p>
              )}
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label>GPS Coordinates (Optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocating}
                >
                  <Navigation className="mr-1.5 h-3.5 w-3.5" />
                  {isLocating ? 'Locating...' : 'Get Current GPS'}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="latitude" className="text-xs text-gray-500">
                    Latitude (-90 to 90)
                  </Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="e.g. 12.9716"
                    {...register('latitude')}
                  />
                  {formErrors.latitude && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.latitude.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="longitude" className="text-xs text-gray-500">
                    Longitude (-180 to 180)
                  </Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="e.g. 77.5946"
                    {...register('longitude')}
                  />
                  {formErrors.longitude && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.longitude.message}</p>
                  )}
                </div>
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-red-600">{submitError}</p>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Save Visit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Visit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Visit Record</DialogTitle>
            <DialogDescription>Update the details of this visit</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-visitDate">Visit Date & Time</Label>
              <Input
                id="edit-visitDate"
                type="datetime-local"
                value={editForm.visitDate || ''}
                onChange={(e) => setEditForm({ ...editForm, visitDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-purpose">Purpose</Label>
              <Input
                id="edit-purpose"
                value={editForm.purpose || ''}
                onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
              />
              {editErrors.purpose && (
                <p className="mt-1 text-sm text-red-600">{editErrors.purpose}</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-result">Result / Outcome</Label>
              <Input
                id="edit-result"
                value={editForm.result || ''}
                onChange={(e) => setEditForm({ ...editForm, result: e.target.value })}
              />
              {editErrors.result && (
                <p className="mt-1 text-sm text-red-600">{editErrors.result}</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={editForm.notes || ''}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-followUpDate">Follow-up Date</Label>
              <Input
                id="edit-followUpDate"
                type="datetime-local"
                value={editForm.followUpDate || ''}
                onChange={(e) => setEditForm({ ...editForm, followUpDate: e.target.value })}
              />
              {editErrors.followUpDate && (
                <p className="mt-1 text-sm text-red-600">{editErrors.followUpDate}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div>
                <Label htmlFor="edit-latitude">Latitude</Label>
                <Input
                  id="edit-latitude"
                  type="number"
                  step="any"
                  value={editForm.latitude !== undefined ? editForm.latitude : ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      latitude: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                />
                {editErrors.latitude && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.latitude}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-longitude">Longitude</Label>
                <Input
                  id="edit-longitude"
                  type="number"
                  step="any"
                  value={editForm.longitude !== undefined ? editForm.longitude : ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      longitude: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                />
                {editErrors.longitude && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.longitude}</p>
                )}
              </div>
            </div>

            {editErrors.submit && (
              <p className="text-sm text-red-600">{editErrors.submit}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
