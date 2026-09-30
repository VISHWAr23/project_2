// User instruction: "Phase 8: Expense Management - Create frontend expenses list, filter bar, metric cards, create modal with receipt upload, approve/reject workflow, and edit modal"
// Importers/callers: Next.js App Router (/expenses), navigation from Dashboard (/dashboard)
// Affected API: /api/expenses (list, create, update, approve, reject, uploadReceipt), /api/employees (list)
// Data schemas: Expense, ExpenseType, ExpenseStatus, ExpenseSummary, ExpenseListResponse, ExpenseQueryParams, CreateExpensePayload, UpdateExpensePayload, RejectExpensePayload

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { expensesApi } from '@/lib/api/expenses';
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
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowLeft,
  FileText,
  Upload,
  Eye,
  Check,
  X,
  Edit2,
  Receipt,
  Car,
  Plane,
  Utensils,
  Hotel,
  HelpCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import type {
  Expense,
  ExpenseType,
  ExpenseStatus,
  CreateExpensePayload,
  UpdateExpensePayload,
} from '@/types/expense.types';

const createExpenseSchema = z.object({
  employee: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  type: z.enum(['FUEL', 'TRAVEL', 'FOOD', 'ACCOMMODATION', 'OTHER']),
  amount: z.coerce.number().min(0.01, 'Amount must be at least 0.01'),
  description: z.string().trim().min(1, 'Description is required'),
  receiptUrl: z.string().optional(),
});

type CreateExpenseFormValues = z.infer<typeof createExpenseSchema>;

export default function ExpensesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals & Action State
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedExpenseForEdit, setSelectedExpenseForEdit] =
    useState<Expense | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedExpenseForReject, setSelectedExpenseForReject] =
    useState<Expense | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Receipt Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>('');

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdateExpensePayload>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const limit = 10;

  // React Hook Form for Create Expense
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateExpenseFormValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: 'FUEL',
      amount: undefined,
      description: '',
      receiptUrl: '',
    },
  });

  const selectedType = watch('type');

  // 1. Fetch Expenses list
  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: [
      'expenses',
      page,
      employeeFilter,
      typeFilter,
      statusFilter,
      startDate,
      endDate,
    ],
    queryFn: () =>
      expensesApi.list({
        page,
        limit,
        employeeId: employeeFilter !== 'all' ? employeeFilter : undefined,
        type: typeFilter !== 'all' ? (typeFilter as ExpenseType) : undefined,
        status: statusFilter !== 'all' ? (statusFilter as ExpenseStatus) : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate
          ? new Date(endDate + 'T23:59:59.999Z').toISOString()
          : undefined,
      }),
  });

  // 2. Fetch Employees list for filter & admin assignment (Admin only)
  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'active-list'],
    queryFn: () => employeesApi.list({ limit: 100 }),
    enabled: !!isAdmin,
  });

  // 3. Create Expense Mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateExpensePayload) => expensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setCreateOpen(false);
      reset();
      setReceiptUrl('');
      setUploadError(null);
    },
  });

  // 4. Update Expense Mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateExpensePayload;
    }) => expensesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setEditOpen(false);
      setSelectedExpenseForEdit(null);
      setReceiptUrl('');
      setUploadError(null);
    },
  });

  // 5. Approve Expense Mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => expensesApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  // 6. Reject Expense Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      expensesApi.reject(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setRejectDialogOpen(false);
      setSelectedExpenseForReject(null);
      setRejectReason('');
      setRejectError('');
    },
  });

  // Handle Receipt Upload
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean = false,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds maximum limit of 5MB');
      return;
    }

    // Validate format
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid format. Use JPEG, PNG, WebP, GIF, or PDF.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const res = await expensesApi.uploadReceipt(file);
      setReceiptUrl(res.url);
      if (isEdit) {
        setEditForm((prev) => ({ ...prev, receiptUrl: res.url }));
      } else {
        setValue('receiptUrl', res.url);
      }
    } catch {
      setUploadError('Failed to upload receipt. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateSubmit = (data: CreateExpenseFormValues) => {
    createMutation.mutate({
      employee:
        isAdmin && data.employee && data.employee !== 'self'
          ? data.employee
          : undefined,
      date: new Date(data.date).toISOString(),
      type: data.type,
      amount: Math.round(Number(data.amount) * 100) / 100,
      description: data.description.trim(),
      receiptUrl: receiptUrl || undefined,
    });
  };

  const handleEditOpen = (expense: Expense) => {
    setSelectedExpenseForEdit(expense);
    setEditForm({
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : '',
      type: expense.type,
      amount: expense.amount,
      description: expense.description,
      receiptUrl: expense.receiptUrl || '',
    });
    setReceiptUrl(expense.receiptUrl || '');
    setEditErrors({});
    setEditOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedExpenseForEdit) return;
    const errors: Record<string, string> = {};

    if (!editForm.date) errors.date = 'Date is required';
    if (!editForm.amount || Number(editForm.amount) < 0.01)
      errors.amount = 'Amount must be at least 0.01';
    if (!editForm.description?.trim())
      errors.description = 'Description is required';

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    updateMutation.mutate({
      id: selectedExpenseForEdit._id,
      data: {
        date: editForm.date ? new Date(editForm.date).toISOString() : undefined,
        type: editForm.type,
        amount: editForm.amount
          ? Math.round(Number(editForm.amount) * 100) / 100
          : undefined,
        description: editForm.description?.trim(),
        receiptUrl: editForm.receiptUrl || undefined,
      },
    });
  };

  const handleRejectClick = (expense: Expense) => {
    setSelectedExpenseForReject(expense);
    setRejectReason('');
    setRejectError('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedExpenseForReject) return;
    if (!rejectReason.trim()) {
      setRejectError('A rejection reason is required');
      return;
    }

    rejectMutation.mutate({
      id: selectedExpenseForReject._id,
      reason: rejectReason.trim(),
    });
  };

  const clearFilters = () => {
    setEmployeeFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const getTypeIcon = (type: ExpenseType) => {
    switch (type) {
      case 'FUEL':
        return <Car className="size-3.5 text-amber-600 dark:text-amber-400" />;
      case 'TRAVEL':
        return <Plane className="size-3.5 text-blue-600 dark:text-blue-400" />;
      case 'FOOD':
        return <Utensils className="size-3.5 text-orange-600 dark:text-orange-400" />;
      case 'ACCOMMODATION':
        return <Hotel className="size-3.5 text-purple-600 dark:text-purple-400" />;
      default:
        return <HelpCircle className="size-3.5 text-zinc-600 dark:text-zinc-400" />;
    }
  };

  const getTypeBadgeClass = (type: ExpenseType) => {
    switch (type) {
      case 'FUEL':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'TRAVEL':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'FOOD':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'ACCOMMODATION':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
    }
  };

  const getStatusBadge = (status: ExpenseStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="size-3" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="size-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="size-3" /> Pending
          </span>
        );
    }
  };

  const summary = expensesData?.summary || {
    totalAmount: 0,
    totalCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
    approvedAmount: 0,
    approvedCount: 0,
    rejectedAmount: 0,
    rejectedCount: 0,
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" /> Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Receipt className="size-6 text-emerald-600 dark:text-emerald-400" />
              Expense Management
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isAdmin
                ? 'Review, approve, and track employee business expenses'
                : 'Log and track your field and marketing reimbursement requests'}
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            reset();
            setReceiptUrl('');
            setUploadError(null);
            setCreateOpen(true);
          }}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="size-4" /> Log Expense
        </Button>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Financial Metrics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Total Expenses
              </CardTitle>
              <DollarSign className="size-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                ${summary.totalAmount.toFixed(2)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {summary.totalCount} {summary.totalCount === 1 ? 'claim' : 'claims'} submitted
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Pending Approval
              </CardTitle>
              <Clock className="size-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                ${summary.pendingAmount.toFixed(2)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {summary.pendingCount} pending review
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Approved
              </CardTitle>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ${summary.approvedAmount.toFixed(2)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {summary.approvedCount} approved claims
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-rose-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Rejected
              </CardTitle>
              <XCircle className="size-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                ${summary.rejectedAmount.toFixed(2)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {summary.rejectedCount} rejected claims
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {isAdmin && (
                <div>
                  <Label className="text-xs mb-1.5 block">Employee</Label>
                  <Select
                    value={employeeFilter}
                    onValueChange={(val: string) => {
                      setEmployeeFilter(val);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full text-xs">
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
                <Label className="text-xs mb-1.5 block">Expense Type</Label>
                <Select
                  value={typeFilter}
                  onValueChange={(val: string) => {
                    setTypeFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="FUEL">Fuel</SelectItem>
                    <SelectItem value="TRAVEL">Travel</SelectItem>
                    <SelectItem value="FOOD">Food</SelectItem>
                    <SelectItem value="ACCOMMODATION">Accommodation</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(val: string) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Start Date</Label>
                <Input
                  type="date"
                  className="text-xs"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">End Date</Label>
                <Input
                  type="date"
                  className="text-xs"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
              >
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Expenses List Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Expenses Records</span>
              <span className="text-xs font-normal text-zinc-500">
                Showing {expensesData?.items?.length || 0} of {expensesData?.total || 0}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {expensesLoading ? (
              <div className="flex items-center justify-center p-12 text-zinc-500">
                <Loader2 className="size-6 animate-spin mr-2" />
                <span>Loading expenses...</span>
              </div>
            ) : !expensesData?.items || expensesData.items.length === 0 ? (
              <div className="text-center p-12 text-zinc-500">
                <Receipt className="size-10 mx-auto text-zinc-400 mb-2 opacity-50" />
                <p className="font-medium text-sm">No expenses found</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Try adjusting your filter settings or submit a new expense claim.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      {isAdmin && <th className="px-4 py-3">Employee</th>}
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Receipt</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {expensesData.items.map((expense) => {
                      const isOwner =
                        expense.employee?._id === user?._id ||
                        (typeof expense.employee === 'string' &&
                          expense.employee === user?._id);

                      return (
                        <tr
                          key={expense._id}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                            {new Date(expense.date).toLocaleDateString()}
                          </td>

                          {isAdmin && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {expense.employee?.name || 'Unknown'}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {expense.employee?.email || ''}
                              </div>
                            </td>
                          )}

                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${getTypeBadgeClass(
                                expense.type,
                              )}`}
                            >
                              {getTypeIcon(expense.type)}
                              {expense.type}
                            </span>
                          </td>

                          <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            ${expense.amount.toFixed(2)}
                          </td>

                          <td className="px-4 py-3 max-w-xs truncate text-zinc-600 dark:text-zinc-300">
                            {expense.description}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            {expense.receiptUrl ? (
                              <a
                                href={expense.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                              >
                                <FileText className="size-3.5" /> View Receipt
                                <ExternalLink className="size-3" />
                              </a>
                            ) : (
                              <span className="text-xs text-zinc-400 italic">
                                No receipt
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            {getStatusBadge(expense.status)}
                          </td>

                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/expenses/${expense._id}`)}
                                className="h-8 text-xs gap-1"
                              >
                                <Eye className="size-3.5" /> View
                              </Button>

                              {/* Admin Approve/Reject Controls for PENDING */}
                              {isAdmin && expense.status === 'PENDING' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => approveMutation.mutate(expense._id)}
                                    disabled={approveMutation.isPending}
                                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                  >
                                    <Check className="size-3.5" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRejectClick(expense)}
                                    disabled={rejectMutation.isPending}
                                    className="h-8 text-xs gap-1"
                                  >
                                    <X className="size-3.5" /> Reject
                                  </Button>
                                </>
                              )}

                              {/* Employee Edit Control for PENDING */}
                              {expense.status === 'PENDING' && (isOwner || isAdmin) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditOpen(expense)}
                                  className="h-8 text-xs gap-1"
                                >
                                  <Edit2 className="size-3.5" /> Edit
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {expensesData && expensesData.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-xs"
                >
                  Previous
                </Button>
                <span className="text-xs text-zinc-500 font-medium">
                  Page {page} of {expensesData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= expensesData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-xs"
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CREATE EXPENSE MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-emerald-600" />
              Log Business Expense
            </DialogTitle>
            <DialogDescription>
              Submit an expense reimbursement request. Status will default to Pending.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleCreateSubmit)} className="space-y-4 pt-2">
            {isAdmin && (
              <div>
                <Label className="text-xs mb-1 block">Employee (Optional)</Label>
                <Select
                  defaultValue="self"
                  onValueChange={(val: string) => setValue('employee', val)}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Submit for self or select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Log for myself</SelectItem>
                    {employeesData?.items?.map((emp) => (
                      <SelectItem key={emp._id} value={emp._id}>
                        {emp.name} ({emp.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Expense Type *</Label>
                <Select
                  value={selectedType}
                  onValueChange={(val: any) => setValue('type', val)}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FUEL">Fuel</SelectItem>
                    <SelectItem value="TRAVEL">Travel</SelectItem>
                    <SelectItem value="FOOD">Food</SelectItem>
                    <SelectItem value="ACCOMMODATION">Accommodation</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-rose-500 text-xs mt-1">
                    {errors.type.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs mb-1 block">Date *</Label>
                <Input
                  type="date"
                  className="text-xs"
                  {...register('date')}
                />
                {errors.date && (
                  <p className="text-rose-500 text-xs mt-1">
                    {errors.date.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Amount ($ / INR) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="text-xs font-medium"
                {...register('amount')}
              />
              {errors.amount && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1 block">Description *</Label>
              <textarea
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
                placeholder="Explain the business purpose of this expense..."
                {...register('description')}
              />
              {errors.description && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Receipt Upload Section */}
            <div>
              <Label className="text-xs mb-1 block">Receipt Attachment (Optional)</Label>
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-center">
                {receiptUrl ? (
                  <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate max-w-xs flex items-center gap-1.5">
                      <FileText className="size-4 text-emerald-500 shrink-0" />
                      Receipt uploaded successfully
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReceiptUrl('');
                        setValue('receiptUrl', '');
                      }}
                      className="h-6 text-rose-500 hover:text-rose-600 text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="receipt-file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                      onChange={(e) => handleFileUpload(e, false)}
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="receipt-file"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="size-5 animate-spin text-emerald-600" />
                          <span>Uploading receipt...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="size-5 text-zinc-400" />
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            Click to upload receipt
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            JPEG, PNG, WebP, GIF, or PDF (max 5MB)
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
              {uploadError && (
                <p className="text-rose-500 text-xs mt-1">{uploadError}</p>
              )}
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || isUploading}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {createMutation.isPending && (
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                )}
                Submit Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT EXPENSE MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-5 text-blue-600" />
              Edit Pending Expense
            </DialogTitle>
            <DialogDescription>
              Only pending expenses can be modified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Expense Type *</Label>
                <Select
                  value={editForm.type || 'FUEL'}
                  onValueChange={(val: any) =>
                    setEditForm((prev) => ({ ...prev, type: val }))
                  }
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FUEL">Fuel</SelectItem>
                    <SelectItem value="TRAVEL">Travel</SelectItem>
                    <SelectItem value="FOOD">Food</SelectItem>
                    <SelectItem value="ACCOMMODATION">Accommodation</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Date *</Label>
                <Input
                  type="date"
                  className="text-xs"
                  value={editForm.date || ''}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
                {editErrors.date && (
                  <p className="text-rose-500 text-xs mt-1">
                    {editErrors.date}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Amount ($ / INR) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                className="text-xs font-medium"
                value={editForm.amount || ''}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    amount: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
              {editErrors.amount && (
                <p className="text-rose-500 text-xs mt-1">
                  {editErrors.amount}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1 block">Description *</Label>
              <textarea
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={editForm.description || ''}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
              {editErrors.description && (
                <p className="text-rose-500 text-xs mt-1">
                  {editErrors.description}
                </p>
              )}
            </div>

            {/* Edit Receipt Upload */}
            <div>
              <Label className="text-xs mb-1 block">Receipt Attachment</Label>
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-center">
                {receiptUrl ? (
                  <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate max-w-xs flex items-center gap-1.5">
                      <FileText className="size-4 text-blue-500 shrink-0" />
                      Receipt attached
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReceiptUrl('');
                        setEditForm((prev) => ({ ...prev, receiptUrl: '' }));
                      }}
                      className="h-6 text-rose-500 hover:text-rose-600 text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="edit-receipt-file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                      onChange={(e) => handleFileUpload(e, true)}
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="edit-receipt-file"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="size-5 animate-spin text-blue-600" />
                          <span>Uploading receipt...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="size-5 text-zinc-400" />
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            Upload new receipt
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleEditSubmit}
                disabled={updateMutation.isPending || isUploading}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateMutation.isPending && (
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* REJECT EXPENSE CONFIRMATION MODAL */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <XCircle className="size-5" /> Reject Expense Claim
            </DialogTitle>
            <DialogDescription>
              Please provide a clear reason for rejecting this claim. This reason will be recorded and visible to the employee.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs mb-1 block">Rejection Reason *</Label>
              <textarea
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                rows={3}
                placeholder="e.g. Missing valid receipt, amount discrepancy, unapproved travel..."
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  setRejectError('');
                }}
              />
              {rejectError && (
                <p className="text-rose-500 text-xs mt-1">{rejectError}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={rejectMutation.isPending}
                className="text-xs"
              >
                {rejectMutation.isPending && (
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                )}
                Confirm Rejection
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
