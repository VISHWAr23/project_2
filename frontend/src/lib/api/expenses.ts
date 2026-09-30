// User instruction: "Phase 8: Expense Management - Create frontend expenses API client"
// Importers/callers: frontend/src/app/expenses/page.tsx, frontend/src/app/expenses/[id]/page.tsx
// Affected API: /api/expenses (list, getById, create, update, approve, reject, uploadReceipt)
// Data schemas: Expense, ExpenseListResponse, ExpenseQueryParams, CreateExpensePayload, UpdateExpensePayload, RejectExpensePayload

import apiClient from '../api-client';
import type {
  Expense,
  ExpenseListResponse,
  ExpenseQueryParams,
  CreateExpensePayload,
  UpdateExpensePayload,
  RejectExpensePayload,
} from '@/types/expense.types';

export const expensesApi = {
  list: async (params?: ExpenseQueryParams): Promise<ExpenseListResponse> => {
    const response = await apiClient.get<ExpenseListResponse>('/expenses', {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Expense> => {
    const response = await apiClient.get<Expense>(`/expenses/${id}`);
    return response.data;
  },

  create: async (data: CreateExpensePayload): Promise<Expense> => {
    const response = await apiClient.post<Expense>('/expenses', data);
    return response.data;
  },

  update: async (id: string, data: UpdateExpensePayload): Promise<Expense> => {
    const response = await apiClient.patch<Expense>(`/expenses/${id}`, data);
    return response.data;
  },

  approve: async (id: string): Promise<Expense> => {
    const response = await apiClient.patch<Expense>(`/expenses/${id}/approve`);
    return response.data;
  },

  reject: async (
    id: string,
    data: RejectExpensePayload,
  ): Promise<Expense> => {
    const response = await apiClient.patch<Expense>(
      `/expenses/${id}/reject`,
      data,
    );
    return response.data;
  },

  uploadReceipt: async (
    file: File,
  ): Promise<{ url: string; key?: string; mimetype?: string; size?: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{
      url: string;
      key?: string;
      mimetype?: string;
      size?: number;
    }>('/expenses/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
