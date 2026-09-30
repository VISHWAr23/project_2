// User instruction: "Phase 8: Expense Management - Create frontend expense detail page with receipt preview, reviewer timeline, edit modal, and admin approval/rejection actions"
// Importers/callers: Next.js App Router (/expenses/[id]), links from /expenses list
// Affected API: /api/expenses (getById, update, approve, reject, uploadReceipt)
// Data schemas: Expense, ExpenseType, ExpenseStatus, UpdateExpensePayload, RejectExpensePayload

'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { expensesApi } from '@/lib/api/expenses';
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
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  DollarSign,
  AlertTriangle,
  ExternalLink,
  Edit2,
  Check,
  X,
  Upload,
  Loader2,
  Car,
  Plane,
  Utensils,
  Hotel,
  HelpCircle,
  ShieldCheck,
  Download,
} from 'lucide-react';
import type {
  Expense,
  ExpenseType,
  ExpenseStatus,
  UpdateExpensePayload,
} from '@/types/expense.types';

export default function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const expenseId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<UpdateExpensePayload>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Reject Modal State
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // 1. Fetch Expense detail
  const { data: expense, isLoading, isError } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => expensesApi.getById(expenseId),
    enabled: !!expenseId,
  });

  // 2. Approve Mutation
  const approveMutation = useMutation({
    mutationFn: () => expensesApi.approve(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', expenseId] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  // 3. Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => expensesApi.reject(expenseId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', expenseId] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setRejectOpen(false);
      setRejectReason('');
      setRejectError('');
    },
  });

  // 4. Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateExpensePayload) =>
      expensesApi.update(expenseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', expenseId] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setEditOpen(false);
      setUploadError(null);
    },
  });

  const handleEditOpen = () => {
    if (!expense) return;
    setEditForm({
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : '',
      type: expense.type,
      amount: expense.amount,
      description: expense.description,
      receiptUrl: expense.receiptUrl || '',
    });
    setEditErrors({});
    setUploadError(null);
    setEditOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setEditForm((prev) => ({ ...prev, receiptUrl: res.url }));
    } catch {
      setUploadError('Failed to upload receipt. Please try again.');
    } finally {
      setIsUploading(false);
    }
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

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) {
      setRejectError('Rejection reason is required');
      return;
    }
    rejectMutation.mutate(rejectReason.trim());
  };

  const isOwner =
    expense &&
    (expense.employee?._id === user?._id ||
      (typeof expense.employee === 'string' && expense.employee === user?._id));

  const getTypeIcon = (type: ExpenseType) => {
    switch (type) {
      case 'FUEL':
        return <Car className="size-4 text-amber-600 dark:text-amber-400" />;
      case 'TRAVEL':
        return <Plane className="size-4 text-blue-600 dark:text-blue-400" />;
      case 'FOOD':
        return <Utensils className="size-4 text-orange-600 dark:text-orange-400" />;
      case 'ACCOMMODATION':
        return <Hotel className="size-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <HelpCircle className="size-4 text-zinc-600 dark:text-zinc-400" />;
    }
  };

  const getStatusBadge = (status: ExpenseStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="size-3.5" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="size-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="size-3.5" /> Pending Review
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500">
          <Loader2 className="size-6 animate-spin text-emerald-600" />
          <span>Loading expense details...</span>
        </div>
      </div>
    );
  }

  if (isError || !expense) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="size-12 text-rose-500" />
        <h2 className="text-xl font-bold">Expense Record Not Found</h2>
        <p className="text-sm text-zinc-500">
          The requested expense claim could not be loaded or you do not have permission to view it.
        </p>
        <Button onClick={() => router.push('/expenses')} variant="outline">
          <ArrowLeft className="size-4 mr-2" /> Back to Expenses
        </Button>
      </div>
    );
  }

  const isPdfReceipt = expense.receiptUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 space-y-6">
      {/* Top Header */}
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/expenses')}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" /> Back to Expenses
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Expense #{expense._id.slice(-6).toUpperCase()}
              </h1>
              {getStatusBadge(expense.status)}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Logged on {new Date(expense.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {expense.status === 'PENDING' && (isOwner || isAdmin) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditOpen}
              className="gap-1.5 text-xs"
            >
              <Edit2 className="size-3.5" /> Edit Expense
            </Button>
          )}

          {isAdmin && expense.status === 'PENDING' && (
            <>
              <Button
                size="sm"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setRejectReason('');
                  setRejectError('');
                  setRejectOpen(true);
                }}
                disabled={rejectMutation.isPending}
                className="gap-1.5 text-xs"
              >
                <X className="size-3.5" /> Reject
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Columns: Main Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Rejection Alert Banner if Rejected */}
          {expense.status === 'REJECTED' && (
            <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                <XCircle className="size-4 text-rose-600" />
                Claim Rejected by Administrator
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                <span className="font-semibold">Reason: </span>
                {expense.rejectionReason || 'No specific reason provided'}
              </p>
            </div>
          )}

          {/* Approval Banner if Approved */}
          {expense.status === 'APPROVED' && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Expense Approved for Reimbursement
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Approved by {expense.reviewedBy?.name || 'Administrator'} on{' '}
                {expense.reviewedAt
                  ? new Date(expense.reviewedAt).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          )}

          {/* Primary Expense Info Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <CardTitle className="text-base font-semibold">
                Expense Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-zinc-500 block">Amount Claimed</span>
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center">
                    ${expense.amount.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-zinc-500 block">Expense Category</span>
                  <div className="mt-1 flex items-center gap-1.5 font-medium text-sm text-zinc-800 dark:text-zinc-200">
                    {getTypeIcon(expense.type)}
                    <span>{expense.type}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-zinc-500 block">Expense Date</span>
                  <div className="mt-1 flex items-center gap-1 text-sm text-zinc-800 dark:text-zinc-200">
                    <Calendar className="size-3.5 text-zinc-400" />
                    <span>{new Date(expense.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs text-zinc-500 block mb-1">
                  Purpose / Description
                </span>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900 p-3 rounded-md border border-zinc-200 dark:border-zinc-800 leading-relaxed">
                  {expense.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Preview Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="size-4 text-emerald-600" />
                Receipt Proof
              </CardTitle>
              {expense.receiptUrl && (
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                >
                  Open Original <ExternalLink className="size-3" />
                </a>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              {expense.receiptUrl ? (
                isPdfReceipt ? (
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 text-center space-y-3 bg-zinc-50 dark:bg-zinc-900">
                    <FileText className="size-12 mx-auto text-rose-500" />
                    <div>
                      <p className="font-medium text-sm">PDF Document Attached</p>
                      <p className="text-xs text-zinc-400">
                        Click below to view or download the attached receipt document.
                      </p>
                    </div>
                    <a
                      href={expense.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      <Download className="size-3.5" /> Download / View PDF
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 flex items-center justify-center max-h-[500px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={expense.receiptUrl}
                        alt="Receipt proof"
                        className="object-contain max-h-[500px] w-full"
                      />
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center p-8 text-zinc-400 border border-dashed rounded-lg">
                  <FileText className="size-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No receipt attached to this claim</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Employee & Metadata Sidebar */}
        <div className="space-y-6">
          {/* Employee Info Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="size-4 text-zinc-500" />
                Employee Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div>
                <span className="text-zinc-400 block">Name</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                  {expense.employee?.name || 'Unknown'}
                </span>
              </div>

              <div>
                <span className="text-zinc-400 block">Email Address</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {expense.employee?.email || 'N/A'}
                </span>
              </div>

              {expense.employee?.phone && (
                <div>
                  <span className="text-zinc-400 block">Phone Number</span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {expense.employee.phone}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit & Review Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="size-4 text-zinc-500" />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div>
                <span className="text-zinc-400 block">Submission Date</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {new Date(expense.createdAt).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-zinc-400 block">Last Modification</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {new Date(expense.updatedAt).toLocaleString()}
                </span>
              </div>

              {expense.reviewedBy && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-400 block">Reviewed By</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {expense.reviewedBy.name} ({expense.reviewedBy.email})
                  </span>
                  {expense.reviewedAt && (
                    <span className="text-zinc-400 block mt-0.5">
                      on {new Date(expense.reviewedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-5 text-blue-600" />
              Edit Pending Expense
            </DialogTitle>
            <DialogDescription>
              Update your expense information and receipt attachment.
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
                  <p className="text-rose-500 text-xs mt-1">{editErrors.date}</p>
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
                <p className="text-rose-500 text-xs mt-1">{editErrors.amount}</p>
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

            {/* Receipt Upload */}
            <div>
              <Label className="text-xs mb-1 block">Receipt Attachment</Label>
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-center">
                {editForm.receiptUrl ? (
                  <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate max-w-xs flex items-center gap-1.5">
                      <FileText className="size-4 text-blue-500 shrink-0" />
                      Receipt attached
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEditForm((prev) => ({ ...prev, receiptUrl: '' }))
                      }
                      className="h-6 text-rose-500 hover:text-rose-600 text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="edit-detail-receipt-file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="edit-detail-receipt-file"
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
              {uploadError && (
                <p className="text-rose-500 text-xs mt-1">{uploadError}</p>
              )}
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

      {/* REJECT CONFIRMATION MODAL */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <XCircle className="size-5" /> Reject Expense Claim
            </DialogTitle>
            <DialogDescription>
              Please enter a reason for rejecting this claim. This reason will be recorded and shown to the employee.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs mb-1 block">Rejection Reason *</Label>
              <textarea
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                rows={3}
                placeholder="e.g. Ineligible category, missing proof, incorrect amount..."
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
                onClick={() => setRejectOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleRejectSubmit}
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
