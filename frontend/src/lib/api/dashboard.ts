// User instruction: "Phase 9: Dashboard - Create frontend dashboard API client"
// Importers/callers: frontend/src/app/dashboard/page.tsx
// Affected API: GET /api/dashboard/admin, GET /api/dashboard/employee
// Data schemas: AdminDashboardData, EmployeeDashboardData, QueryDashboardParams

import apiClient from '../api-client';
import type {
  AdminDashboardData,
  EmployeeDashboardData,
  QueryDashboardParams,
} from '@/types/dashboard.types';

export const dashboardApi = {
  getAdminDashboard: async (
    params?: QueryDashboardParams,
  ): Promise<AdminDashboardData> => {
    const response = await apiClient.get<AdminDashboardData>('/dashboard/admin', {
      params,
    });
    return response.data;
  },

  getEmployeeDashboard: async (
    params?: QueryDashboardParams,
  ): Promise<EmployeeDashboardData> => {
    const response = await apiClient.get<EmployeeDashboardData>(
      '/dashboard/employee',
      {
        params,
      },
    );
    return response.data;
  },
};
