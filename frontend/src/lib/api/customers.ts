// User instruction: "Phase 4: Customer Management - Create customer frontend API client"
// Importers/callers: frontend/src/app/customers/page.tsx, frontend/src/app/customers/[id]/page.tsx
// Affected API: /api/customers (list, getById, create, update, updateStatus)
// Data schemas: Customer, CreateCustomerPayload, UpdateCustomerPayload, CustomerListResponse

import apiClient from '../api-client';
import type {
  Customer,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  CustomerListResponse,
} from '@/types/customer.types';

export const customersApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    employeeId?: string;
  }): Promise<CustomerListResponse> => {
    const response = await apiClient.get<CustomerListResponse>('/customers', {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Customer> => {
    const response = await apiClient.get<Customer>(`/customers/${id}`);
    return response.data;
  },

  create: async (data: CreateCustomerPayload): Promise<Customer> => {
    const response = await apiClient.post<Customer>('/customers', data);
    return response.data;
  },

  update: async (id: string, data: UpdateCustomerPayload): Promise<Customer> => {
    const response = await apiClient.patch<Customer>(`/customers/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<Customer> => {
    const response = await apiClient.patch<Customer>(`/customers/${id}/status`, {
      status,
    });
    return response.data;
  },
};
