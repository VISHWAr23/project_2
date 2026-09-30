// User instruction: "Phase 8: Expense Management - Create frontend expense type definitions and interfaces"
// Importers/callers: frontend/src/lib/api/expenses.ts, frontend/src/app/expenses/page.tsx, frontend/src/app/expenses/[id]/page.tsx
// Affected API: Frontend Expense TypeScript interfaces
// Data schemas: Expense, ExpenseType, ExpenseStatus, ExpenseSummary, ExpenseListResponse, ExpenseQueryParams, CreateExpensePayload, UpdateExpensePayload, RejectExpensePayload

export type ExpenseType = 'FUEL' | 'TRAVEL' | 'FOOD' | 'ACCOMMODATION' | 'OTHER';

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Expense {
  _id: string;
  employee: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  date: string;
  type: ExpenseType;
  amount: number;
  description: string;
  receiptUrl?: string;
  status: ExpenseStatus;
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSummary {
  totalAmount: number;
  totalCount: number;
  pendingAmount: number;
  pendingCount: number;
  approvedAmount: number;
  approvedCount: number;
  rejectedAmount: number;
  rejectedCount: number;
}

export interface ExpenseQueryParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  type?: ExpenseType;
  status?: ExpenseStatus;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseListResponse {
  items: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: ExpenseSummary;
}

export interface CreateExpensePayload {
  employee?: string;
  date: string;
  type: ExpenseType;
  amount: number;
  description: string;
  receiptUrl?: string;
}

export interface UpdateExpensePayload {
  date?: string;
  type?: ExpenseType;
  amount?: number;
  description?: string;
  receiptUrl?: string;
}

export interface RejectExpensePayload {
  reason: string;
}
