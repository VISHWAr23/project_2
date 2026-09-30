// User instruction: "Phase 9: Dashboard - Create AdminDashboardDto structure and interfaces"
// Importers/callers: backend/src/dashboard/dashboard.service.ts, backend/src/dashboard/dashboard.controller.ts, backend/src/dashboard/dashboard.service.spec.ts
// Affected API: GET /api/dashboard/admin
// Data schemas: AdminDashboardDto, AdminSummaryDto, AdminPendingApprovalsDto, AdminOrdersDto, AdminExpensesDto, AdminIncentivesDto, AdminVisitsDto, AdminCustomersDto, EmployeePerformanceDto

import { ExpenseType } from '../../expenses/schemas/expense.schema.js';
import { OrderStatus } from '../../orders/schemas/order.schema.js';

export interface AdminSummaryDto {
  totalEmployees: number;
  totalCustomers: number;
  totalVisits: number;
  totalOrders: number;
  totalOrderValue: number;
  totalExpenses: number;
  totalApprovedExpenseAmount: number;
  totalPendingExpenseAmount: number;
  totalIncentives: number;
  totalPaidIncentives: number;
  totalUnpaidIncentives: number;
}

export interface AdminPendingApprovalsDto {
  pendingOrdersCount: number;
  pendingOrdersAmount: number;
  pendingExpensesCount: number;
  pendingExpensesAmount: number;
}

export interface DateWiseMetricDto {
  date: string;
  count: number;
  totalAmount: number;
}

export interface ExpenseByTypeDto {
  type: ExpenseType;
  count: number;
  totalAmount: number;
}

export interface EmployeeMetricDto {
  employeeId: string;
  employeeName: string;
  count: number;
}

export interface AdminOrdersDto {
  totalOrders: number;
  approvedOrders: number;
  completedOrders: number;
  pendingOrders: number;
  rejectedOrders: number;
  cancelledOrders: number;
  totalOrderValue: number;
  approvedOrderValue: number;
  dateWiseOrderValue: DateWiseMetricDto[];
}

export interface AdminExpensesDto {
  totalExpenses: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  rejectedCount: number;
  rejectedAmount: number;
  byType: ExpenseByTypeDto[];
}

export interface AdminIncentivesDto {
  totalIncentives: number;
  totalAmount: number;
  unpaidCount: number;
  unpaidAmount: number;
  paidCount: number;
  paidAmount: number;
  dateWiseIncentives: DateWiseMetricDto[];
}

export interface AdminRecentVisitDto {
  id: string;
  customerName: string;
  employeeName: string;
  visitDate: Date;
  purpose: string;
  result: string;
  followUpDate?: Date;
}

export interface AdminVisitsDto {
  totalVisits: number;
  visitsByEmployee: EmployeeMetricDto[];
  recentVisits: AdminRecentVisitDto[];
}

export interface AdminCustomersDto {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  customersByEmployee: EmployeeMetricDto[];
}

export interface EmployeePerformanceDto {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  assignedCustomers: number;
  visits: number;
  orders: number;
  orderValue: number;
  approvedIncentives: number;
  totalExpenses: number;
}

export interface AdminDashboardDto {
  summary: AdminSummaryDto;
  pendingApprovals: AdminPendingApprovalsDto;
  orders: AdminOrdersDto;
  expenses: AdminExpensesDto;
  incentives: AdminIncentivesDto;
  visits: AdminVisitsDto;
  customers: AdminCustomersDto;
  employeePerformance: EmployeePerformanceDto[];
}
