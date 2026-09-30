// User instruction: "Phase 5: Customer Visit Management - Update Customer Detail UI with Visit History"
// Importers/callers: Next.js App Router
// Affected API: /api/customers/:id, /api/customers/:customerId/visits, /api/visits
// Data schemas: Customer, UpdateCustomerPayload, Visit, CreateVisitPayload

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
import { ArrowLeft, Save, Plus, Calendar, Clock, MapPin, Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { UpdateCustomerPayload } from '@/types/customer.types';

const recordVisitSchema = z.object({
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

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', resolvedParams.id],
    queryFn: () => customersApi.getById(resolvedParams.id),
    staleTime: 0,
  });

  const { data: visits, isLoading: visitsLoading } = useQuery({
    queryKey: ['customer-visits', resolvedParams.id],
    queryFn: () => visitsApi.getByCustomer(resolvedParams.id),
    staleTime: 0,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ limit: 100, isActive: true }),
    enabled: isAdmin,
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
        followUpDate: values.followUpDate ? new Date(values.followUpDate).toISOString() : undefined,
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
    const errors: Record<string, string> = {};
    if (form.customerName !== undefined && !form.customerName.trim())
      errors.customerName = 'Customer name cannot be empty';
    if (form.businessName !== undefined && !form.businessName.trim())
      errors.businessName = 'Business name cannot be empty';
    if (form.phone !== undefined && !form.phone.trim())
      errors.phone = 'Phone cannot be empty';
    if (form.address !== undefined && !form.address.trim())
      errors.address = 'Address cannot be empty';
    setErrors(errors);
    return Object.keys(errors).length === 0;
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
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const onSubmitVisit = (data: RecordVisitFormValues) => {
    setRecordError(null);
    createVisitMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Loading customer...
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="py-12 text-center text-red-600">
              Customer not found or you don&apos;t have permission to view this customer.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/customers')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Customer Details</h1>
          </div>
          <Button
            onClick={() => {
              resetRecordForm();
              setRecordError(null);
              setRecordModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Record Visit
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={form.customerName !== undefined ? form.customerName : customer.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              />
              {errors.customerName && (
                <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={form.businessName !== undefined ? form.businessName : customer.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              />
              {errors.businessName && (
                <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone !== undefined ? form.phone : customer.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address !== undefined ? form.address : customer.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
            </div>

            {isAdmin && (
              <div>
                <Label htmlFor="assignedEmployee">Assigned Employee</Label>
                <Select
                  value={
                    form.assignedEmployee !== undefined
                      ? form.assignedEmployee
                      : customer.assignedEmployee?._id || ''
                  }
                  onValueChange={(v: string) => setForm({ ...form, assignedEmployee: v })}
                >
                  <SelectTrigger id="assignedEmployee">
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

            {!isAdmin && (
              <div>
                <Label>Assigned Employee</Label>
                <p className="mt-2 text-sm text-gray-600">
                  {customer.assignedEmployee?.name} ({customer.assignedEmployee?.email})
                </p>
              </div>
            )}

            <div>
              <Label>Status</Label>
              <div className="mt-2">
                {customer.status === 'ACTIVE' ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setForm({});
                  setErrors({});
                }}
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending || Object.keys(form).length === 0}
              >
                {updateMutation.isPending ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customer Visit History Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Visit History</CardTitle>
            <span className="text-xs text-gray-500">
              {visits?.length || 0} Total Recorded Visits
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {visitsLoading && (
              <div className="py-8 text-center text-sm text-gray-500">
                Loading visit history...
              </div>
            )}

            {!visitsLoading && (!visits || visits.length === 0) && (
              <div className="py-8 text-center text-sm text-gray-500">
                No recorded visits for this client yet.
              </div>
            )}

            {!visitsLoading && visits && visits.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Purpose
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Result
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Follow-Up
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        GPS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {visits.map((visit) => (
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
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                          {visit.employee?.name || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          {visit.purpose}
                          {visit.notes && (
                            <p className="text-xs text-gray-500 mt-0.5">{visit.notes}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
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
                            <span className="text-gray-400">N/A</span>
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

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label>Created</Label>
              <p className="mt-1 text-sm text-gray-600">
                {new Date(customer.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <Label>Last Updated</Label>
              <p className="mt-1 text-sm text-gray-600">
                {new Date(customer.updatedAt).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Record Visit for this Customer Dialog */}
      <Dialog open={recordModalOpen} onOpenChange={setRecordModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Visit for {customer.customerName}</DialogTitle>
            <DialogDescription>Log a field interaction with {customer.businessName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitVisit)} className="space-y-4">
            {isAdmin && (
              <div>
                <Label htmlFor="modal-employee">Assigned Field Employee (Optional)</Label>
                <Select
                  onValueChange={(v: string) => setValue('employee', v, { shouldValidate: true })}
                >
                  <SelectTrigger id="modal-employee">
                    <SelectValue placeholder="Select employee" />
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
              <Label htmlFor="modal-visitDate">Visit Date & Time</Label>
              <Input
                id="modal-visitDate"
                type="datetime-local"
                {...register('visitDate')}
              />
              {formErrors.visitDate && (
                <p className="mt-1 text-sm text-red-600">{formErrors.visitDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="modal-purpose">Purpose of Visit</Label>
              <Input
                id="modal-purpose"
                placeholder="e.g., Contract review, Order follow-up"
                {...register('purpose')}
              />
              {formErrors.purpose && (
                <p className="mt-1 text-sm text-red-600">{formErrors.purpose.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="modal-result">Result / Outcome</Label>
              <Input
                id="modal-result"
                placeholder="e.g., Quotation sent, Follow-up agreed"
                {...register('result')}
              />
              {formErrors.result && (
                <p className="mt-1 text-sm text-red-600">{formErrors.result.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="modal-notes">Detailed Meeting Notes (Optional)</Label>
              <Input
                id="modal-notes"
                placeholder="Key takeaways, client feedback"
                {...register('notes')}
              />
            </div>

            <div>
              <Label htmlFor="modal-followUpDate">Next Follow-up Date (Optional)</Label>
              <Input
                id="modal-followUpDate"
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
                  <Label htmlFor="modal-latitude" className="text-xs text-gray-500">
                    Latitude (-90 to 90)
                  </Label>
                  <Input
                    id="modal-latitude"
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
                  <Label htmlFor="modal-longitude" className="text-xs text-gray-500">
                    Longitude (-180 to 180)
                  </Label>
                  <Input
                    id="modal-longitude"
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

            {recordError && (
              <p className="text-sm text-red-600">{recordError}</p>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setRecordModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createVisitMutation.isPending}>
                {createVisitMutation.isPending ? 'Saving...' : 'Save Visit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
