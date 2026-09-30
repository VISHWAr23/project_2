// User instruction: "Phase 10: Reports - Create frontend reports API client covering all 7 report endpoints"
// Importers/callers: frontend/src/app/reports/page.tsx
// Affected API: /api/reports/*
// Data schemas: EmployeeVisitReport, EmployeeOrderReport, EmployeeSalesReport, EmployeeExpenseReport, EmployeeIncentiveReport, CustomerVisitHistory, DateWiseReport, QueryReportsParams, QueryCustomerVisitsParams

import apiClient from '../api-client';
import type {
  EmployeeVisitReport,
  EmployeeOrderReport,
  EmployeeSalesReport,
  EmployeeExpenseReport,
  EmployeeIncentiveReport,
  CustomerVisitHistory,
  DateWiseReport,
  QueryReportsParams,
  QueryCustomerVisitsParams,
} from '@/types/report.types';

export const reportsApi = {
  getEmployeeVisits: async (
    params?: QueryReportsParams,
  ): Promise<EmployeeVisitReport[]> => {
    const response = await apiClient.get<EmployeeVisitReport[]>(
      '/reports/visits/employees',
      { params },
    );
    return response.data;
  },

  getEmployeeOrders: async (
    params?: QueryReportsParams,
  ): Promise<EmployeeOrderReport[]> => {
    const response = await apiClient.get<EmployeeOrderReport[]>(
      '/reports/orders/employees',
      { params },
    );
    return response.data;
  },

  getEmployeeSales: async (
    params?: QueryReportsParams,
  ): Promise<EmployeeSalesReport[]> => {
    const response = await apiClient.get<EmployeeSalesReport[]>(
      '/reports/sales/employees',
      { params },
    );
    return response.data;
  },

  getEmployeeExpenses: async (
    params?: QueryReportsParams,
  ): Promise<EmployeeExpenseReport[]> => {
    const response = await apiClient.get<EmployeeExpenseReport[]>(
      '/reports/expenses/employees',
      { params },
    );
    return response.data;
  },

  getEmployeeIncentives: async (
    params?: QueryReportsParams,
  ): Promise<EmployeeIncentiveReport[]> => {
    const response = await apiClient.get<EmployeeIncentiveReport[]>(
      '/reports/incentives/employees',
      { params },
    );
    return response.data;
  },

  getCustomerVisitHistory: async (
    customerId: string,
    params?: QueryCustomerVisitsParams,
  ): Promise<CustomerVisitHistory> => {
    const response = await apiClient.get<CustomerVisitHistory>(
      `/reports/customers/${customerId}/visits`,
      { params },
    );
    return response.data;
  },

  getDateWiseReport: async (
    params?: QueryReportsParams,
  ): Promise<DateWiseReport[]> => {
    const response = await apiClient.get<DateWiseReport[]>(
      '/reports/date-wise',
      { params },
    );
    return response.data;
  },
};
