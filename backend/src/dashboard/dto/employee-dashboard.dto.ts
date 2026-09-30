// User instruction: "Phase 9: Dashboard - Create EmployeeDashboardDto structure and interfaces"
// Importers/callers: backend/src/dashboard/dashboard.service.ts, backend/src/dashboard/dashboard.controller.ts, backend/src/dashboard/dashboard.service.spec.ts
// Affected API: GET /api/dashboard/employee
// Data schemas: EmployeeDashboardDto, EmployeeSummaryDto, EmployeeCustomersDto, EmployeeVisitsDto, EmployeeOrdersDto, EmployeeExpensesDto, EmployeeIncentivesDto

import { ExpenseType } from '../../expenses/schemas/expense.schema.js';
import { OrderStatus } from '../../orders/schemas/order.schema.js';

export interface EmployeeSummaryDto {
  assignedCustomers: number;
  totalVisits: number;
  totalOrders: number;
  totalOrderValue: number;
  pendingExpensesCount: number;
  pendingExpensesAmount: number;
  approvedExpensesCount: number;
  approvedExpensesAmount: number;
  pendingIncentivesCount: number;
  pendingIncentivesAmount: number;
  paidIncentivesCount: number;
  paidIncentivesAmount: number;
}

export interface EmployeeCustomersDto {
  total: number;
  active: number;
  inactive: number;
}

export interface EmployeeRecentVisitDto {
  id: string;
  customerName: string;
  visitDate: Date;
  purpose: string;
  result: string;
  followUpDate?: Date;
}

export interface EmployeeVisitsDto {
  total: number;
  recent: EmployeeRecentVisitDto[];
}

export interface EmployeeRecentOrderDto {
  id: string;
  customerName: string;
  orderDate: Date;
  totalAmount: number;
  status: OrderStatus;
  itemsCount: number;
}

export interface EmployeeOrdersDto {
  total: number;
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
  cancelled: number;
  totalValue: number;
  recent: EmployeeRecentOrderDto[];
}

export interface EmployeeExpensesDto {
  total: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  rejectedCount: number;
  rejectedAmount: number;
  byType: Array<{ type: ExpenseType; count: number; totalAmount: number }>;
}

export interface EmployeeIncentivesDto {
  total: number;
  totalAmount: number;
  unpaidCount: number;
  unpaidAmount: number;
  paidCount: number;
  paidAmount: number;
}

export interface EmployeeDashboardDto {
  summary: EmployeeSummaryDto;
  customers: EmployeeCustomersDto;
  visits: EmployeeVisitsDto;
  orders: EmployeeOrdersDto;
  expenses: EmployeeExpensesDto;
  incentives: EmployeeIncentivesDto;
}
