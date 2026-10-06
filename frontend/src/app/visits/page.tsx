// User instruction: "11. Visits (/visits): Field visit tracking (Map/list view, Check-in with geolocation, Customer selection, Visit purpose/notes, Photo attachment, Outcome recording, Today's schedule vs past visits)."
// Importers/callers: Next.js App Router (/visits), AppShell, Sidebar navigation
// Affected API: GET /api/visits, POST /api/visits, PATCH /api/visits/:id, GET /api/customers, GET /api/employees
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Plus,
  Edit2,
  MapPin,
  Calendar,
  Clock,
  Navigation,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Compass,
  FileText,
  Camera,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  UserCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Visit } from '@/types/visit.types';
import { formatDate } from '@/lib/format';

const createVisitSchema = z
  .object({
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

type CreateVisitFormValues = z.infer<typeof createVisitSchema>;

export default function VisitsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<'today' | 'all' | 'map'>('today');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Filter States
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dialog & Form States
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // Load Active Customers
  const { data: customersData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customersApi.list({ limit: 100, status: 'ACTIVE' }),
    enabled: !!user,
  });

  // Load Active Field Employees for Admins
  const { data: employeesData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ limit: 100, isActive: true }),
    enabled: isAdmin,
  });

  // Query Visits
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
    enabled: !!user,
  });

  // Create Visit Mutation
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

  // Update Visit Mutation
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
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const onSubmitCreate = (formValues: CreateVisitFormValues) => {
    setSubmitError(null);
    createMutation.mutate(formValues);
  };

  const openEdit = (visit: Visit) => {
    setSelectedVisit(visit);
    setEditForm({
      visitDate: visit.visitDate ? new Date(visit.visitDate).toISOString().slice(0, 16) : '',
      purpose: visit.purpose,
      notes: visit.notes || '',
      result: visit.result,
      followUpDate: visit.followUpDate
        ? new Date(visit.followUpDate).toISOString().slice(0, 16)
        : '',
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
      payload.followUpDate = editForm.followUpDate
        ? new Date(editForm.followUpDate).toISOString()
        : undefined;
    }
    if (editForm.latitude !== undefined && editForm.latitude !== '')
      payload.latitude = Number(editForm.latitude);
    if (editForm.longitude !== undefined && editForm.longitude !== '')
      payload.longitude = Number(editForm.longitude);

    updateMutation.mutate({ id: selectedVisit._id, payload });
  };

  const items = data?.items || [];

  // Filter items by client search
  const filteredItems = items.filter((visit) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const customerName =
      typeof visit.customer === 'object'
        ? (visit.customer?.customerName || visit.customer?.businessName || '').toLowerCase()
        : '';
    const purpose = (visit.purpose || '').toLowerCase();
    const result = (visit.result || '').toLowerCase();
    const notes = (visit.notes || '').toLowerCase();
    return (
      customerName.includes(query) ||
      purpose.includes(query) ||
      result.includes(query) ||
      notes.includes(query)
    );
  });

  // Calculate Today's visits vs Past
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayVisits = filteredItems.filter((v) => {
    if (!v.visitDate) return false;
    return new Date(v.visitDate).toISOString().slice(0, 10) === todayStr;
  });

  const geoTaggedVisits = filteredItems.filter(
    (v) => v.latitude !== undefined && v.longitude !== undefined
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title={isAdmin ? 'Field Visit Operations' : 'My Field Visits'}
        subtitle={
          isAdmin
            ? 'Track real-time GPS check-ins, territory schedules, and meeting outcomes across your sales force.'
            : 'Record customer checkpoints, log client meetings, and track follow-up commitments.'
        }
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetCreateForm();
              handleGetCurrentLocation();
              setCreateOpen(true);
            }}
            className="gap-1.5 text-xs text-foreground font-medium"
          >
            <Navigation className="size-3.5 text-primary" />
            <span>Quick GPS Check-In</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetCreateForm();
              setSubmitError(null);
              setCreateOpen(true);
            }}
            className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            <span>Record New Visit</span>
          </Button>
        </div>
      </PageHeader>

      {/* High-Level Operational Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Visits"
          value={data?.total || 0}
          icon={Layers}
          description="Logged field interactions"
        />
        <StatCard
          title="Today's Schedule"
          value={todayVisits.length}
          icon={Calendar}
          description="Visits scheduled for today"
        />
        <StatCard
          title="GPS Verified"
          value={geoTaggedVisits.length}
          icon={MapPin}
          description="Geo-coordinates tagged"
        />
        <StatCard
          title="Active Accounts"
          value={customersData?.total || customersData?.items?.length || 0}
          icon={Building2}
          description="Clients in active territory"
        />
      </div>

      {/* Tab Controls & View Mode */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs">
          <Button
            variant={activeTab === 'today' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('today')}
            className="gap-1.5 text-xs text-foreground font-medium rounded-lg"
          >
            <Clock className="size-3.5" />
            <span>Today&apos;s Schedule ({todayVisits.length})</span>
          </Button>

          <Button
            variant={activeTab === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('all')}
            className="gap-1.5 text-xs text-foreground font-medium rounded-lg"
          >
            <FileText className="size-3.5" />
            <span>All Visit Logs ({filteredItems.length})</span>
          </Button>

          <Button
            variant={activeTab === 'map' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('map')}
            className="gap-1.5 text-xs text-foreground font-medium rounded-lg"
          >
            <Compass className="size-3.5" />
            <span>Territory Radar ({geoTaggedVisits.length})</span>
          </Button>
        </div>

        {/* Global Live Filter Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search purpose, notes, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-card border-border"
          />
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Filter className="size-3.5 text-primary" />
            <span>Refine Territory Records</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
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

            <div>
              <Label htmlFor="customerFilter" className="text-[11px] text-muted-foreground">
                Target Account
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

            <div>
              <Label htmlFor="endDate" className="text-[11px] text-muted-foreground">
                To Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="mt-1 h-8 text-xs bg-background border-border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
          <RefreshCw className="size-8 animate-spin text-primary" />
          <p className="font-semibold text-foreground text-sm">Loading field visits...</p>
        </div>
      )}

      {error && (
        <EmptyState
          icon={Compass}
          title="Failed to Load Visits"
          description="There was an error communicating with the visit tracking service. Please try again."
        />
      )}

      {/* TAB 1: Today's Schedule & Check-ins */}
      {!isLoading && !error && activeTab === 'today' && (
        <div className="space-y-4">
          {todayVisits.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-8">
                <EmptyState
                  icon={Calendar}
                  title="No Field Visits Scheduled for Today"
                  description="You have no client interactions queued for today. Use the button below to log an unscheduled walk-in or check-in."
                  action={{
                    label: 'Quick Check-In Now',
                    onClick: () => {
                      resetCreateForm();
                      handleGetCurrentLocation();
                      setCreateOpen(true);
                    },
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayVisits.map((visit) => {
                const customerName =
                  typeof visit.customer === 'object'
                    ? visit.customer?.customerName || visit.customer?.businessName
                    : 'Customer';
                return (
                  <Card
                    key={visit._id}
                    className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer group"
                    onClick={() => openEdit(visit)}
                  >
                    <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-xs font-mono text-primary font-bold">
                          {formatDate(visit.visitDate)}
                        </p>
                        <CardTitle className="text-sm font-semibold text-foreground font-heading group-hover:text-primary transition-colors">
                          {customerName}
                        </CardTitle>
                      </div>
                      <StatusBadge status={visit.result ? 'COMPLETED' : 'PENDING'} />
                    </CardHeader>
                    <CardContent className="p-4 pt-1 space-y-3 text-xs">
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                          Purpose
                        </p>
                        <p className="text-foreground mt-0.5 font-medium">{visit.purpose}</p>
                      </div>

                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                          Recorded Outcome
                        </p>
                        <p className="text-muted-foreground mt-0.5 line-clamp-2">{visit.result}</p>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          {visit.latitude !== undefined && visit.longitude !== undefined ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <MapPin className="size-3" />
                              GPS Tagged
                            </span>
                          ) : (
                            <span>No GPS Tag</span>
                          )}
                        </span>
                        <span className="text-primary hover:underline font-sans font-semibold">
                          Edit Details →
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: All Visit Logs */}
      {!isLoading && !error && activeTab === 'all' && (
        <Card className="bg-card border-border overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={FileText}
                title="No Matching Visit Logs Found"
                description="No field interactions match the current filter or search criteria."
                action={{
                  label: 'Clear Filters',
                  onClick: () => {
                    setCustomerFilter('all');
                    setEmployeeFilter('all');
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
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-3">Target Customer</th>
                    <th className="py-3 px-3">Sales Executive</th>
                    <th className="py-3 px-3">Meeting Purpose</th>
                    <th className="py-3 px-3">Outcome / Result</th>
                    <th className="py-3 px-3">Follow-Up</th>
                    <th className="py-3 px-3">GPS Checkpoint</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredItems.map((visit) => {
                    const customerName =
                      typeof visit.customer === 'object'
                        ? visit.customer?.customerName || visit.customer?.businessName
                        : 'Customer Account';
                    const employeeName =
                      typeof visit.employee === 'object' ? visit.employee?.name : 'Representative';

                    return (
                      <tr
                        key={visit._id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => openEdit(visit)}
                      >
                        <td className="py-3 px-4 font-mono text-foreground font-medium">
                          <div>{formatDate(visit.visitDate)}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="size-3" />
                            {new Date(visit.visitDate).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="py-3 px-3 font-semibold text-foreground">
                          {customerName}
                        </td>

                        <td className="py-3 px-3 text-muted-foreground">
                          {employeeName}
                        </td>

                        <td className="py-3 px-3 text-foreground max-w-xs truncate font-medium">
                          {visit.purpose}
                        </td>

                        <td className="py-3 px-3 text-muted-foreground max-w-xs truncate">
                          {visit.result}
                        </td>

                        <td className="py-3 px-3 font-mono">
                          {visit.followUpDate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/20">
                              {formatDate(visit.followUpDate)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px]">
                          {visit.latitude !== undefined && visit.longitude !== undefined ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <MapPin className="size-3" />
                              {Number(visit.latitude).toFixed(4)}, {Number(visit.longitude).toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Unverified</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEdit(visit)}
                            className="size-7 text-muted-foreground hover:text-foreground"
                            title="Edit Record"
                          >
                            <Edit2 className="size-3.5" />
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
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
              <p className="text-muted-foreground">
                Page <span className="text-foreground font-semibold font-mono">{data.page}</span> of{' '}
                <span className="text-foreground font-semibold font-mono">{data.totalPages}</span> ·{' '}
                <span className="text-foreground font-semibold font-mono">{data.total}</span> total visits
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
                  disabled={page === data.totalPages}
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

      {/* TAB 3: Territory Radar & Geo-Checkpoints */}
      {!isLoading && !error && activeTab === 'map' && (
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground font-heading flex items-center gap-2">
                <Compass className="size-4 text-primary" />
                Live Geo-Checkpoints & Radar View
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Visualizing all GPS-confirmed client interactions recorded in the field.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {geoTaggedVisits.length === 0 ? (
                <EmptyState
                  icon={MapPin}
                  title="No GPS Coordinates Available"
                  description="None of the visits in the current scope have recorded GPS coordinates."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {geoTaggedVisits.map((visit) => {
                    const customerName =
                      typeof visit.customer === 'object'
                        ? visit.customer?.customerName || visit.customer?.businessName
                        : 'Customer Account';
                    return (
                      <div
                        key={visit._id}
                        className="p-4 rounded-xl bg-background border border-border space-y-2 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground font-heading">
                            {customerName}
                          </span>
                          <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Verified
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">{visit.purpose}</p>
                        <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3 text-primary" />
                            {Number(visit.latitude).toFixed(4)}, {Number(visit.longitude).toFixed(4)}
                          </span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${visit.latitude},${visit.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 font-sans font-semibold"
                          >
                            Open Maps <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record Visit Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">Record Customer Visit</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Log an in-person client checkpoint, demonstration, or catalog review.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-4 text-xs">
            <div>
              <Label htmlFor="customer" className="text-xs text-foreground">
                Target Customer Account <span className="text-rose-400">*</span>
              </Label>
              <Select
                onValueChange={(v: string) => setValue('customer', v, { shouldValidate: true })}
              >
                <SelectTrigger id="customer" className="mt-1 h-9 text-xs bg-background border-border">
                  <SelectValue placeholder="Select client account" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {customersData?.items?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.customerName || c.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.customer && (
                <p className="mt-1 text-[11px] text-rose-400">{formErrors.customer.message}</p>
              )}
            </div>

            {isAdmin && (
              <div>
                <Label htmlFor="employee" className="text-xs text-foreground">
                  Field Representative (Admin override)
                </Label>
                <Select
                  onValueChange={(v: string) => setValue('employee', v, { shouldValidate: true })}
                >
                  <SelectTrigger id="employee" className="mt-1 h-9 text-xs bg-background border-border">
                    <SelectValue placeholder="Select assigned executive" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
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
              <Label htmlFor="visitDate" className="text-xs text-foreground">
                Visit Date & Time <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="visitDate"
                type="datetime-local"
                {...register('visitDate')}
                className="mt-1 h-9 text-xs bg-background border-border font-mono"
              />
              {formErrors.visitDate && (
                <p className="mt-1 text-[11px] text-rose-400">{formErrors.visitDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="purpose" className="text-xs text-foreground">
                Meeting Purpose <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="purpose"
                placeholder="e.g., Product demonstration, Catalog update, Stock audit"
                {...register('purpose')}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {formErrors.purpose && (
                <p className="mt-1 text-[11px] text-rose-400">{formErrors.purpose.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="result" className="text-xs text-foreground">
                Outcome / Key Takeaways <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="result"
                placeholder="e.g., Client requested commercial quotation for 500 units"
                {...register('result')}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {formErrors.result && (
                <p className="mt-1 text-[11px] text-rose-400">{formErrors.result.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes" className="text-xs text-foreground">
                Detailed Discussion Notes (Optional)
              </Label>
              <Input
                id="notes"
                placeholder="Additional feedback, competitors mentioned, pricing queries"
                {...register('notes')}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
            </div>

            <div>
              <Label htmlFor="followUpDate" className="text-xs text-foreground">
                Scheduled Follow-up Date (Optional)
              </Label>
              <Input
                id="followUpDate"
                type="datetime-local"
                {...register('followUpDate')}
                className="mt-1 h-9 text-xs bg-background border-border font-mono"
              />
              {formErrors.followUpDate && (
                <p className="mt-1 text-[11px] text-rose-400">{formErrors.followUpDate.message}</p>
              )}
            </div>

            {/* GPS Geolocation Coordinates */}
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground">GPS Location Coordinates</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocating}
                  className="gap-1.5 text-xs text-foreground font-medium"
                >
                  <Navigation className="size-3 text-primary" />
                  <span>{isLocating ? 'Acquiring GPS...' : 'Auto-Capture Location'}</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="latitude" className="text-[11px] text-muted-foreground">
                    Latitude (-90 to 90)
                  </Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="e.g. 12.9716"
                    {...register('latitude')}
                    className="mt-1 h-8 text-xs bg-background border-border font-mono"
                  />
                  {formErrors.latitude && (
                    <p className="mt-1 text-[11px] text-rose-400">{formErrors.latitude.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="longitude" className="text-[11px] text-muted-foreground">
                    Longitude (-180 to 180)
                  </Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="e.g. 77.5946"
                    {...register('longitude')}
                    className="mt-1 h-8 text-xs bg-background border-border font-mono"
                  />
                  {formErrors.longitude && (
                    <p className="mt-1 text-[11px] text-rose-400">{formErrors.longitude.message}</p>
                  )}
                </div>
              </div>
            </div>

            {submitError && (
              <p className="text-xs text-rose-400 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                {submitError}
              </p>
            )}

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="text-xs text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                {createMutation.isPending ? 'Logging Checkpoint...' : 'Confirm & Save Visit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Visit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">Edit Visit Checkpoint</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update notes, outcome, or follow-up commitments for this interaction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div>
              <Label htmlFor="edit-visitDate" className="text-xs text-foreground">
                Visit Date & Time
              </Label>
              <Input
                id="edit-visitDate"
                type="datetime-local"
                value={editForm.visitDate || ''}
                onChange={(e) => setEditForm({ ...editForm, visitDate: e.target.value })}
                className="mt-1 h-9 text-xs bg-background border-border font-mono"
              />
            </div>

            <div>
              <Label htmlFor="edit-purpose" className="text-xs text-foreground">
                Meeting Purpose
              </Label>
              <Input
                id="edit-purpose"
                value={editForm.purpose || ''}
                onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {editErrors.purpose && (
                <p className="mt-1 text-[11px] text-rose-400">{editErrors.purpose}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-result" className="text-xs text-foreground">
                Outcome / Result
              </Label>
              <Input
                id="edit-result"
                value={editForm.result || ''}
                onChange={(e) => setEditForm({ ...editForm, result: e.target.value })}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
              {editErrors.result && (
                <p className="mt-1 text-[11px] text-rose-400">{editErrors.result}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-notes" className="text-xs text-foreground">
                Detailed Discussion Notes
              </Label>
              <Input
                id="edit-notes"
                value={editForm.notes || ''}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="mt-1 h-9 text-xs bg-background border-border"
              />
            </div>

            <div>
              <Label htmlFor="edit-followUpDate" className="text-xs text-foreground">
                Scheduled Follow-up Date
              </Label>
              <Input
                id="edit-followUpDate"
                type="datetime-local"
                value={editForm.followUpDate || ''}
                onChange={(e) => setEditForm({ ...editForm, followUpDate: e.target.value })}
                className="mt-1 h-9 text-xs bg-background border-border font-mono"
              />
              {editErrors.followUpDate && (
                <p className="mt-1 text-[11px] text-rose-400">{editErrors.followUpDate}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div>
                <Label htmlFor="edit-latitude" className="text-[11px] text-muted-foreground">
                  Latitude
                </Label>
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
                  className="mt-1 h-8 text-xs bg-background border-border font-mono"
                />
                {editErrors.latitude && (
                  <p className="mt-1 text-[11px] text-rose-400">{editErrors.latitude}</p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-longitude" className="text-[11px] text-muted-foreground">
                  Longitude
                </Label>
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
                  className="mt-1 h-8 text-xs bg-background border-border font-mono"
                />
                {editErrors.longitude && (
                  <p className="mt-1 text-[11px] text-rose-400">{editErrors.longitude}</p>
                )}
              </div>
            </div>

            {editErrors.submit && (
              <p className="text-xs text-rose-400 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                {editErrors.submit}
              </p>
            )}
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="text-xs text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={updateMutation.isPending}
              className="text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
