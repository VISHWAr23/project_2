// User instruction: "14. Expenses (/expenses, /expenses/[id]): Expense submission (Category selection [Travel, Food, Stay, Fuel, Other], amount, description, receipt upload with image preview, date, client linkage), Expense list (Status filters [Pending, Approved, Rejected], date filter, employee filter for admin, summary cards [Total, Pending, Approved, Rejected]), Expense detail (Receipt viewer with zoom/rotate, approval workflow with rejection reason, payment status), Admin batch approval."
// Importers/callers: Next.js App Router (/expenses), AppShell, Sidebar navigation
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { CurrencyDisplay } from '@/components/ui/currency-display';
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
  Filter,
  RotateCcw,
  Loader2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { formatDate } from '@/lib/format';
import type {
  Expense,
  ExpenseType,
  ExpenseStatus,
  CreateExpensePayload,
  UpdateExpensePayload,
} from '@/types/expense.types';

// Zod validation schema for creating an expense claim
const createExpenseSchema = z.object({
  type: z.enum(['FUEL', 'TRAVEL', 'FOOD', 'ACCOMMODATION', 'OTHER'] as const, {
    required_error: 'Please select an expense category',
  }),
  amount: z.coerce
    .number({ invalid_type_error: 'Amount must be a numeric value' })
    .positive('Amount must be greater than zero'),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(500, 'Description cannot exceed 500 characters'),
  date: z.string().min(1, 'Please select an expense date'),
  receiptUrl: z.string().optional(),
  employee: z.string().optional(),
});

type CreateExpenseFormData = z.infer<typeof createExpenseSchema>;

export default function ExpensesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // State Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals State
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Upload State for Receipt
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>('');

  // Edit Form state
  const [editForm, setEditForm] = useState<UpdateExpensePayload>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // 1. Fetch Employees for Admin Filter & Form
  const { data: employeesData } = useQuery({
    queryKey: ['employees', { limit: 100 }],
    queryFn: () => employeesApi.list({ limit: 100 }),
    enabled: !!user && isAdmin,
  });

  // 2. Fetch Expenses Query
  const queryParams = {
    page,
    limit: 10,
    status: statusFilter !== 'ALL' ? (statusFilter as ExpenseStatus) : undefined,
    type: typeFilter !== 'ALL' ? (typeFilter as ExpenseType) : undefined,
    employee: employeeFilter !== 'ALL' ? employeeFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const {
    data: expensesData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['expenses', queryParams],
    queryFn: () => expensesApi.list(queryParams),
    enabled: !!user,
  });

  // React Hook Form for Create
  const {
    register,
    handleSubmit,
    reset: resetCreateForm,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateExpenseFormData>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      type: 'FUEL',
      date: new Date().toISOString().split('T')[0],
      receiptUrl: '',
      employee: 'self',
    },
  });

  const selectedType = watch('type');

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateExpensePayload) => expensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setCreateOpen(false);
      resetCreateForm();
      setReceiptUrl('');
      setUploadError(null);
    },
    onError: (err: any) => {
      setUploadError(err.response?.data?.message || 'Failed to submit expense claim');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateExpensePayload) => {
      if (!selectedExpense) throw new Error('No expense selected');
      return expensesApi.update(selectedExpense._id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setEditOpen(false);
      setSelectedExpense(null);
      setReceiptUrl('');
      setUploadError(null);
    },
    onError: (err: any) => {
      setUploadError(err.response?.data?.message || 'Failed to update expense');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => expensesApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to approve expense');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      expensesApi.reject(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setRejectDialogOpen(false);
      setSelectedExpense(null);
      setRejectReason('');
      setRejectError('');
    },
    onError: (err: any) => {
      setRejectError(err.response?.data?.message || 'Failed to reject expense');
    },
  });

  // Handle Receipt Upload
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds maximum limit of 5MB');
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file format. Allowed: JPEG, PNG, WebP, GIF, PDF');
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

  const handleCreateSubmit = (data: CreateExpenseFormData) => {
    const payload: CreateExpensePayload = {
      date: new Date(data.date).toISOString(),
      type: data.type,
      amount: Math.round(Number(data.amount) * 100) / 100,
      description: data.description.trim(),
      receiptUrl: data.receiptUrl || undefined,
      employee: data.employee && data.employee !== 'self' ? data.employee : undefined,
    };
    createMutation.mutate(payload);
  };

  const handleEditOpen = (expense: Expense) => {
    setSelectedExpense(expense);
    setEditForm({
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : '',
      type: expense.type,
      amount: expense.amount,
      description: expense.description,
      receiptUrl: expense.receiptUrl || '',
    });
    setReceiptUrl(expense.receiptUrl || '');
    setEditErrors({});
    setUploadError(null);
    setEditOpen(true);
  };

  const handleEditSubmit = () => {
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
      date: editForm.date ? new Date(editForm.date).toISOString() : undefined,
      type: editForm.type,
      amount: editForm.amount
        ? Math.round(Number(editForm.amount) * 100) / 100
        : undefined,
      description: editForm.description?.trim(),
      receiptUrl: editForm.receiptUrl || undefined,
    });
  };

  const handleRejectOpen = (expense: Expense) => {
    setSelectedExpense(expense);
    setRejectReason('');
    setRejectError('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) {
      setRejectError('Please specify a rejection reason');
      return;
    }
    if (!selectedExpense) return;
    rejectMutation.mutate({ id: selectedExpense._id, reason: rejectReason.trim() });
  };

  const resetFilters = () => {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setEmployeeFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const getTypeIcon = (type: ExpenseType) => {
    switch (type) {
      case 'FUEL':
        return <Car className="size-3.5 text-amber-400" />;
      case 'TRAVEL':
        return <Plane className="size-3.5 text-sky-400" />;
      case 'FOOD':
        return <Utensils className="size-3.5 text-orange-400" />;
      case 'ACCOMMODATION':
        return <Hotel className="size-3.5 text-purple-400" />;
      default:
        return <HelpCircle className="size-3.5 text-zinc-400" />;
    }
  };

  const summary = expensesData?.summary;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Expense Claims"
        subtitle="Manage business travel reimbursements, receipt attachments, and disbursement approvals."
      >
        <Button
          onClick={() => {
            resetCreateForm();
            setReceiptUrl('');
            setUploadError(null);
            setCreateOpen(true);
          }}
          className="h-9 px-4 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-1.5 shadow-sm"
        >
          <Plus className="size-3.5" />
          <span>Claim Expense</span>
        </Button>
      </PageHeader>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Claims"
          value={<CurrencyDisplay amount={summary?.totalAmount || 0} />}
          description={`${summary?.totalCount || 0} claims recorded`}
          icon={Receipt}
          variant="default"
        />

        <StatCard
          title="Pending Review"
          value={<CurrencyDisplay amount={summary?.pendingAmount || 0} />}
          description={`${summary?.pendingCount || 0} claims awaiting audit`}
          icon={Clock}
          variant="warning"
        />

        <StatCard
          title="Approved Claims"
          value={<CurrencyDisplay amount={summary?.approvedAmount || 0} />}
          description={`${summary?.approvedCount || 0} claims approved`}
          icon={CheckCircle2}
          variant="success"
        />

        <StatCard
          title="Rejected Claims"
          value={<CurrencyDisplay amount={summary?.rejectedAmount || 0} />}
          description={`${summary?.rejectedCount || 0} claims declined`}
          icon={XCircle}
          variant="danger"
        />
      </div>

      {/* Main Expenses Ledger Card */}
      <Card className="bg-card border-border">
        <CardHeader className="p-4 border-b border-border/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                Reimbursement Ledger
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Audit trail of commercial receipts, fuel disbursements, and per-diem submissions
              </CardDescription>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(val: string) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[130px] bg-background border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select
                value={typeFilter}
                onValueChange={(val: string) => {
                  setTypeFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[130px] bg-background border-border">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="FUEL">Fuel</SelectItem>
                  <SelectItem value="TRAVEL">Travel</SelectItem>
                  <SelectItem value="FOOD">Food</SelectItem>
                  <SelectItem value="ACCOMMODATION">Stay</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>

              {/* Employee Filter (Admin Only) */}
              {isAdmin && (
                <Select
                  value={employeeFilter}
                  onValueChange={(val: string) => {
                    setEmployeeFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs w-[150px] bg-background border-border">
                    <SelectValue placeholder="Representative" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="ALL">All Field Reps</SelectItem>
                    {employeesData?.items?.map((emp) => (
                      <SelectItem key={emp._id} value={emp._id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Date Filters */}
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs w-[130px] bg-background border-border"
                placeholder="From date"
              />

              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs w-[130px] bg-background border-border"
                placeholder="To date"
              />

              {(statusFilter !== 'ALL' ||
                typeFilter !== 'ALL' ||
                employeeFilter !== 'ALL' ||
                startDate ||
                endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 text-center space-y-2">
              <Receipt className="size-8 animate-pulse text-primary" />
              <p className="text-xs text-muted-foreground">Loading expense records...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center p-16 text-center space-y-2">
              <p className="text-sm font-semibold text-rose-400">Failed to load expense records</p>
              <p className="text-xs text-muted-foreground">Check your network connection and retry.</p>
            </div>
          ) : !expensesData?.items || expensesData.items.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Receipt}
                title="No expense claims found"
                description={
                  statusFilter !== 'ALL' || typeFilter !== 'ALL' || startDate || endDate
                    ? 'No claims match your active filter criteria. Clear filters to see all records.'
                    : 'Submit your first travel or business reimbursement claim using the button above.'
                }
                action={
                  <Button
                    onClick={() => {
                      resetCreateForm();
                      setReceiptUrl('');
                      setUploadError(null);
                      setCreateOpen(true);
                    }}
                    size="sm"
                    className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                  >
                    <Plus className="size-3.5" />
                    <span>Submit Claim</span>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Claim Ref & Date</th>
                    <th className="px-4 py-3">Representative</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Business Purpose</th>
                    <th className="px-4 py-3 text-center">Receipt</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {expensesData.items.map((expense) => {
                    const isOwner =
                      expense.employee?._id === user?._id ||
                      (typeof expense.employee === 'string' && expense.employee === user?._id);

                    return (
                      <tr
                        key={expense._id}
                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => router.push(`/expenses/${expense._id}`)}
                      >
                        {/* Ref & Date */}
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-foreground">
                            #{expense._id.slice(-6).toUpperCase()}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="size-3 text-muted-foreground" />
                            <span>{formatDate(expense.date)}</span>
                          </div>
                        </td>

                        {/* Employee */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground font-heading">
                            {expense.employee?.name || 'Unassigned'}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[150px]">
                            {expense.employee?.email || ''}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-foreground border border-border/60">
                            {getTypeIcon(expense.type)}
                            <span>{expense.type}</span>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3 max-w-xs">
                          <p className="truncate text-foreground font-medium" title={expense.description}>
                            {expense.description}
                          </p>
                          {expense.status === 'REJECTED' && expense.rejectionReason && (
                            <p className="text-[10px] text-rose-400 truncate mt-0.5">
                              Declined: {expense.rejectionReason}
                            </p>
                          )}
                        </td>

                        {/* Receipt Icon */}
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {expense.receiptUrl ? (
                            <a
                              href={expense.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center size-7 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20"
                              title="View Attached Receipt"
                            >
                              <FileText className="size-3.5" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">None</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono font-bold text-foreground text-sm">
                            <CurrencyDisplay amount={expense.amount} />
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={expense.status} />
                        </td>

                        {/* Action Buttons */}
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Detail Link */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/expenses/${expense._id}`)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="View Details"
                            >
                              <Eye className="size-3.5" />
                            </Button>

                            {/* Edit Button for Pending Expense */}
                            {expense.status === 'PENDING' && (isOwner || isAdmin) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOpen(expense)}
                                className="h-7 w-7 p-0 text-sky-400 hover:text-sky-300 hover:bg-sky-950/40"
                                title="Edit Expense"
                              >
                                <Edit2 className="size-3.5" />
                              </Button>
                            )}

                            {/* Admin Approve & Reject Actions */}
                            {isAdmin && expense.status === 'PENDING' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => approveMutation.mutate(expense._id)}
                                  disabled={approveMutation.isPending}
                                  className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                                  title="Approve Claim"
                                >
                                  <Check className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRejectOpen(expense)}
                                  disabled={rejectMutation.isPending}
                                  className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                                  title="Reject Claim"
                                >
                                  <X className="size-3.5" />
                                </Button>
                              </>
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
            <div className="p-4 border-t border-border flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs text-foreground"
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground font-medium">
                Page {page} of {expensesData.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= expensesData.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 text-xs text-foreground"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE EXPENSE MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-heading">
              <Receipt className="size-5 text-primary" />
              Log Business Expense
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Submit an expense reimbursement request. Status will default to Pending review.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleCreateSubmit)} className="space-y-4 pt-2">
            {isAdmin && (
              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">Beneficiary Employee (Optional)</Label>
                <Select
                  defaultValue="self"
                  onValueChange={(val: string) => setValue('employee', val)}
                >
                  <SelectTrigger className="w-full text-xs bg-background border-border">
                    <SelectValue placeholder="Submit for self or select representative" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
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
                <Label className="text-xs mb-1 block text-muted-foreground">Expense Category *</Label>
                <Select
                  value={selectedType}
                  onValueChange={(val: any) => setValue('type', val)}
                >
                  <SelectTrigger className="w-full text-xs bg-background border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="FUEL">Fuel</SelectItem>
                    <SelectItem value="TRAVEL">Travel</SelectItem>
                    <SelectItem value="FOOD">Food</SelectItem>
                    <SelectItem value="ACCOMMODATION">Accommodation</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-rose-400 text-xs mt-1">
                    {errors.type.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">Expense Date *</Label>
                <Input
                  type="date"
                  className="text-xs bg-background border-border"
                  {...register('date')}
                />
                {errors.date && (
                  <p className="text-rose-400 text-xs mt-1">
                    {errors.date.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Claim Amount (INR / ₹) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="text-xs font-mono font-bold bg-background border-border"
                {...register('amount')}
              />
              {errors.amount && (
                <p className="text-rose-400 text-xs mt-1">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Business Purpose / Description *</Label>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                rows={3}
                placeholder="Explain the commercial purpose, customer visited, or travel itinerary..."
                {...register('description')}
              />
              {errors.description && (
                <p className="text-rose-400 text-xs mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Receipt Upload Section */}
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Receipt Proof (Optional)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-3 text-center bg-muted/10">
                {receiptUrl ? (
                  <div className="flex items-center justify-between bg-muted/40 p-2 rounded border border-border">
                    <span className="text-xs text-foreground truncate max-w-xs flex items-center gap-1.5">
                      <FileText className="size-4 text-emerald-400 shrink-0" />
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
                      className="h-6 text-rose-400 hover:text-rose-300 text-xs"
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
                      className="cursor-pointer flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="size-5 animate-spin text-primary" />
                          <span>Uploading receipt...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="size-5 text-muted-foreground" />
                          <span className="font-medium text-primary">
                            Click to upload receipt
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            JPEG, PNG, WebP, GIF, or PDF (max 5MB)
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
              {uploadError && (
                <p className="text-rose-400 text-xs mt-1">{uploadError}</p>
              )}
            </div>

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
                disabled={createMutation.isPending || isUploading}
                className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {createMutation.isPending && (
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                )}
                Submit Claim
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT EXPENSE MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-heading">
              <Edit2 className="size-5 text-sky-400" />
              Edit Pending Expense
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Only pending reimbursement claims can be modified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">Expense Category *</Label>
                <Select
                  value={editForm.type || 'FUEL'}
                  onValueChange={(val: any) =>
                    setEditForm((prev) => ({ ...prev, type: val }))
                  }
                >
                  <SelectTrigger className="w-full text-xs bg-background border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="FUEL">Fuel</SelectItem>
                    <SelectItem value="TRAVEL">Travel</SelectItem>
                    <SelectItem value="FOOD">Food</SelectItem>
                    <SelectItem value="ACCOMMODATION">Accommodation</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">Date *</Label>
                <Input
                  type="date"
                  className="text-xs bg-background border-border"
                  value={editForm.date || ''}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
                {editErrors.date && (
                  <p className="text-rose-400 text-xs mt-1">
                    {editErrors.date}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Amount (INR / ₹) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                className="text-xs font-mono font-bold bg-background border-border"
                value={editForm.amount || ''}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    amount: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
              {editErrors.amount && (
                <p className="text-rose-400 text-xs mt-1">
                  {editErrors.amount}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Business Purpose *</Label>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
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
                <p className="text-rose-400 text-xs mt-1">
                  {editErrors.description}
                </p>
              )}
            </div>

            {/* Edit Receipt Upload */}
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Receipt Attachment</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-3 text-center bg-muted/10">
                {receiptUrl ? (
                  <div className="flex items-center justify-between bg-muted/40 p-2 rounded border border-border">
                    <span className="text-xs text-foreground truncate max-w-xs flex items-center gap-1.5">
                      <FileText className="size-4 text-sky-400 shrink-0" />
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
                      className="h-6 text-rose-400 hover:text-rose-300 text-xs"
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
                      className="cursor-pointer flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="size-5 animate-spin text-primary" />
                          <span>Uploading receipt...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="size-5 text-muted-foreground" />
                          <span className="font-medium text-primary">
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
                className="text-xs text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleEditSubmit}
                disabled={updateMutation.isPending || isUploading}
                className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-semibold"
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
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400 font-heading">
              <XCircle className="size-5" /> Reject Expense Claim
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please provide a clear reason for rejecting this claim. This reason will be recorded and visible to the field representative.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Rejection Reason *</Label>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 text-foreground"
                rows={3}
                placeholder="e.g. Missing valid tax invoice, amount exceeds per-diem policy, unapproved trip..."
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  setRejectError('');
                }}
              />
              {rejectError && (
                <p className="text-rose-400 text-xs mt-1">{rejectError}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectDialogOpen(false)}
                className="text-xs text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={rejectMutation.isPending}
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold"
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
