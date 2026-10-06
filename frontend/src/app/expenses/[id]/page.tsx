// User instruction: "NOW I ONLY WANT TWO THINGS: 1. Make the ENTIRE APPLICATION fully responsive and mobile-friendly. 2. Add a proper Light Theme + Dark Theme with a theme switcher."
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatCard } from '@/components/ui/stat-card';
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
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  User as UserIcon,
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
  Receipt,
  Mail,
  Phone,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { formatDate } from '@/lib/format';
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

  // Receipt Viewer Zoom & Rotate State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

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
    enabled: !!user && !!expenseId,
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
      errors.amount = 'Amount must be at least ₹0.01';
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
        return <Car className="size-4 text-amber-400" />;
      case 'TRAVEL':
        return <Plane className="size-4 text-blue-400" />;
      case 'FOOD':
        return <Utensils className="size-4 text-orange-400" />;
      case 'ACCOMMODATION':
        return <Hotel className="size-4 text-purple-400" />;
      default:
        return <HelpCircle className="size-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center space-y-2">
        <Receipt className="size-8 animate-pulse text-primary" />
        <p className="text-xs text-muted-foreground">Loading expense claim...</p>
      </div>
    );
  }

  if (isError || !expense) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center space-y-4">
        <p className="text-sm font-semibold text-rose-400">Expense record not found or access denied</p>
        <Button onClick={() => router.push('/expenses')} variant="outline" size="sm" className="text-foreground">
          <ArrowLeft className="size-4 mr-2" /> Back to Expenses Ledger
        </Button>
      </div>
    );
  }

  const isPdfReceipt = expense.receiptUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title={`Expense #${expense._id.slice(-6).toUpperCase()}`}
        subtitle={`Submitted on ${formatDate(expense.createdAt)} by ${expense.employee?.name || 'Field Representative'}`}
        backButton={{
          label: 'Expenses',
          onClick: () => router.push('/expenses'),
        }}
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={expense.status} />

          {expense.status === 'PENDING' && (isOwner || isAdmin) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditOpen}
              className="h-8 text-xs gap-1.5 text-foreground"
            >
              <Edit2 className="size-3.5" />
              <span>Edit</span>
            </Button>
          )}

          {isAdmin && expense.status === 'PENDING' && (
            <>
              <Button
                size="sm"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5 shadow-sm"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                <span>Approve Claim</span>
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
                className="h-8 px-3 text-xs gap-1.5 shadow-sm"
              >
                <X className="size-3.5" />
                <span>Reject</span>
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      {/* Financial Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Claim Amount"
          value={<CurrencyDisplay amount={expense.amount} />}
          description="Total requested reimbursement"
          icon={Receipt}
          variant="primary"
        />

        <StatCard
          title="Expense Category"
          value={expense.type}
          description="Operational classification"
          icon={getTypeIcon(expense.type).type as any || Receipt}
          variant="default"
        />

        <StatCard
          title="Expense Date"
          value={formatDate(expense.date)}
          description="Incurred on field duty"
          icon={Calendar}
          variant="default"
        />

        <StatCard
          title="Claim Status"
          value={expense.status}
          description={
            expense.status === 'APPROVED'
              ? 'Authorized for payout'
              : expense.status === 'REJECTED'
              ? 'Claim declined'
              : 'Pending administrative audit'
          }
          icon={
            expense.status === 'APPROVED'
              ? CheckCircle2
              : expense.status === 'REJECTED'
              ? XCircle
              : Clock
          }
          variant={
            expense.status === 'APPROVED'
              ? 'success'
              : expense.status === 'REJECTED'
              ? 'danger'
              : 'warning'
          }
        />
      </div>

      {/* Two Column Layout: Main Breakdown & Metadata Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Main Details & Receipt Viewer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rejection Alert Banner if Rejected */}
          {expense.status === 'REJECTED' && (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-xs text-rose-400">
                <XCircle className="size-4 text-rose-400" />
                Claim Rejected by Administrator
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                <span className="font-semibold text-rose-300">Reason: </span>
                {expense.rejectionReason || 'No specific reason provided.'}
              </p>
            </div>
          )}

          {/* Approval Banner if Approved */}
          {expense.status === 'APPROVED' && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-xs text-emerald-400">
                <CheckCircle2 className="size-4 text-emerald-400" />
                Expense Approved for Reimbursement
              </div>
              <p className="text-xs text-emerald-200/90">
                Approved by {expense.reviewedBy?.name || 'Administrator'} on{' '}
                {expense.reviewedAt ? formatDate(expense.reviewedAt) : 'N/A'}
              </p>
            </div>
          )}

          {/* Primary Expense Info Card */}
          <Card className="bg-card border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Receipt className="size-3.5 text-primary" />
                Expense Description & Justification
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="p-3 bg-muted/20 border border-border/60 rounded-md text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {expense.description}
              </div>
            </CardContent>
          </Card>

          {/* Receipt Proof Viewer Card */}
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <FileText className="size-3.5 text-primary" />
                  Receipt Verification Proof
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">
                  Attached proof of payment or bill document
                </CardDescription>
              </div>
              {expense.receiptUrl && (
                <div className="flex items-center gap-2">
                  {!isPdfReceipt && (
                    <div className="flex items-center gap-1 bg-muted/30 border border-border/60 rounded-md p-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                        className="size-6 text-muted-foreground hover:text-foreground"
                        title="Zoom out"
                      >
                        <ZoomOut className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setZoomLevel(1);
                          setRotation(0);
                        }}
                        className="size-6 text-muted-foreground hover:text-foreground"
                        title="Reset"
                      >
                        <RefreshCw className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                        className="size-6 text-muted-foreground hover:text-foreground"
                        title="Zoom in"
                      >
                        <ZoomIn className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="size-6 text-muted-foreground hover:text-foreground"
                        title="Rotate 90°"
                      >
                        <RotateCw className="size-3" />
                      </Button>
                    </div>
                  )}
                  <a
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  >
                    <span>Original</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-4">
              {expense.receiptUrl ? (
                isPdfReceipt ? (
                  <div className="border border-border/60 rounded-lg p-8 text-center space-y-3 bg-muted/10">
                    <FileText className="size-12 mx-auto text-rose-400" />
                    <div>
                      <p className="font-semibold text-xs text-foreground">PDF Document Attached</p>
                      <p className="text-[11px] text-muted-foreground">
                        Document available for verified review and compliance auditing
                      </p>
                    </div>
                    <a
                      href={expense.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 transition-opacity"
                    >
                      <Download className="size-3.5" />
                      <span>Download / View PDF</span>
                    </a>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border border-border/60 bg-black/40 flex items-center justify-center min-h-[360px] max-h-[540px] p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={expense.receiptUrl}
                      alt="Receipt proof"
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease-in-out',
                      }}
                      className="object-contain max-h-[480px] w-auto max-w-full rounded"
                    />
                  </div>
                )
              ) : (
                <div className="text-center p-8 text-muted-foreground border border-dashed border-border rounded-lg">
                  <FileText className="size-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No receipt attached to this claim</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Employee Info & Reviewer Audit Trail */}
        <div className="space-y-6">
          {/* Employee Information Card */}
          <Card className="bg-card border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                <UserIcon className="size-3.5 text-primary" />
                Field Representative
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-semibold text-foreground font-heading">
                  {expense.employee?.name || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-mono text-foreground flex items-center gap-1">
                  <Mail className="size-3 text-muted-foreground" />
                  {expense.employee?.email || 'N/A'}
                </span>
              </div>
              {expense.employee?.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-mono text-foreground flex items-center gap-1">
                    <Phone className="size-3 text-muted-foreground" />
                    {expense.employee.phone}
                  </span>
                </div>
              )}
              {(expense.employee as { designation?: string })?.designation && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Designation</span>
                  <span className="text-foreground">
                    {(expense.employee as { designation?: string }).designation}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Trail & Review Timeline */}
          <Card className="bg-card border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-primary" />
                Audit Trail & Reviewer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Submission Date</span>
                <span className="text-foreground">
                  {formatDate(expense.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Modification</span>
                <span className="text-foreground">
                  {formatDate(expense.updatedAt)}
                </span>
              </div>

              {expense.reviewedBy && (
                <div className="pt-2 border-t border-border/60 space-y-1">
                  <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Reviewed By</span>
                  <div className="font-medium text-foreground">
                    {expense.reviewedBy.name}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {expense.reviewedBy.email}
                  </div>
                  {expense.reviewedAt && (
                    <div className="text-[11px] text-muted-foreground pt-0.5">
                      on {formatDate(expense.reviewedAt)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-heading">
              <Edit2 className="size-4 text-primary" />
              Edit Pending Expense
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update your expense information and receipt attachment before administrative review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">Expense Type *</Label>
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
                <Label className="text-xs mb-1 block text-muted-foreground">Date *</Label>
                <Input
                  type="date"
                  className="text-xs"
                  value={editForm.date || ''}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
                {editErrors.date && (
                  <p className="text-rose-400 text-xs mt-1">{editErrors.date}</p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                className="text-xs font-mono font-medium"
                value={editForm.amount || ''}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    amount: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
              {editErrors.amount && (
                <p className="text-rose-400 text-xs mt-1">{editErrors.amount}</p>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Description *</Label>
              <textarea
                className="w-full rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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

            {/* Receipt Upload */}
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Receipt Attachment</Label>
              <div className="border border-dashed border-border rounded-lg p-3 text-center bg-muted/10">
                {editForm.receiptUrl ? (
                  <div className="flex items-center justify-between bg-muted/40 p-2 rounded">
                    <span className="text-xs text-foreground truncate max-w-xs flex items-center gap-1.5">
                      <FileText className="size-4 text-primary shrink-0" />
                      Receipt attached
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEditForm((prev) => ({ ...prev, receiptUrl: '' }))
                      }
                      className="h-6 text-rose-400 hover:text-rose-300 text-xs"
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
              {uploadError && (
                <p className="text-rose-400 text-xs mt-1">{uploadError}</p>
              )}
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
                className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
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
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400 font-heading">
              <XCircle className="size-4" /> Reject Expense Claim
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please enter a reason for rejecting this claim. This reason will be recorded and shown to the field employee.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Rejection Reason *</Label>
              <textarea
                className="w-full rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
                rows={3}
                placeholder="e.g. Ineligible category, missing valid invoice, incorrect amount..."
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
                onClick={() => setRejectOpen(false)}
                className="text-xs text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleRejectSubmit}
                disabled={rejectMutation.isPending}
                className="text-xs font-semibold"
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
