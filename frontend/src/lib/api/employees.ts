// User instruction: "Phase 3: Employee Management - Create the Employee Management UI"
// Importers/callers: frontend/src/app/employees/page.tsx, frontend/src/app/employees/[id]/page.tsx
// Affected API: /api/employees endpoints (list, getById, create, update, updateStatus)
// Data schemas: Employee, CreateEmployeePayload, UpdateEmployeePayload, EmployeeListResponse

import apiClient from '../api-client';
import type {
  Employee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  EmployeeListResponse,
} from '@/types/employee.types';

export const employeesApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<EmployeeListResponse> => {
    const response = await apiClient.get<EmployeeListResponse>('/employees', {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Employee> => {
    const response = await apiClient.get<Employee>(`/employees/${id}`);
    return response.data;
  },

  create: async (data: CreateEmployeePayload): Promise<Employee> => {
    const response = await apiClient.post<Employee>('/employees', data);
    return response.data;
  },

  update: async (id: string, data: UpdateEmployeePayload): Promise<Employee> => {
    const response = await apiClient.patch<Employee>(`/employees/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, isActive: boolean): Promise<Employee> => {
    const response = await apiClient.patch<Employee>(`/employees/${id}/status`, {
      isActive,
    });
    return response.data;
  },
};
