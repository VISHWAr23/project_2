// User instruction: "Phase 9: Dashboard - Create frontend dashboard types and interfaces"
// Importers/callers: frontend/src/lib/api/dashboard.ts, frontend/src/app/dashboard/page.tsx
// Affected API: GET /api/dashboard/admin, GET /api/dashboard/employee
// Data schemas: AdminDashboardData, EmployeeDashboardData, QueryDashboardParams, AdminSummary, EmployeeSummary, AdminPendingApprovals, EmployeePerformance

import type { ExpenseType } from './expense.types';
import type { OrderStatus } from './order.types';

export interface QueryDashboardParams {
  startDate?: string;
  endDate?: string;
}

export interface AdminSummary {
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

export interface AdminPendingApprovals {
  pendingOrdersCount: number;
  pendingOrdersAmount: number;
  pendingExpensesCount: number;
  pendingExpensesAmount: number;
}

export interface DateWiseMetric {
  date: string;
  count: number;
  totalAmount: number;
}

export interface ExpenseByType {
  type: ExpenseType;
  count: number;
  totalAmount: number;
}

export interface EmployeeMetric {
  employeeId: string;
  employeeName: string;
  count: number;
}

export interface AdminOrders {
  totalOrders: number;
  approvedOrders: number;
  completedOrders: number;
  pendingOrders: number;
  rejectedOrders: number;
  cancelledOrders: number;
  totalOrderValue: number;
  approvedOrderValue: number;
  dateWiseOrderValue: DateWiseMetric[];
}

export interface AdminExpenses {
  totalExpenses: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  rejectedCount: number;
  rejectedAmount: number;
  byType: ExpenseByType[];
}

export interface AdminIncentives {
  totalIncentives: number;
  totalAmount: number;
  unpaidCount: number;
  unpaidAmount: number;
  paidCount: number;
  paidAmount: number;
  dateWiseIncentives: DateWiseMetric[];
}

export interface AdminRecentVisit {
  id: string;
  customerName: string;
  employeeName: string;
  visitDate: string;
  purpose: string;
  result: string;
  followUpDate?: string;
}

export interface AdminVisits {
  totalVisits: number;
  visitsByEmployee: EmployeeMetric[];
  recentVisits: AdminRecentVisit[];
}

export interface AdminCustomers {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  customersByEmployee: EmployeeMetric[];
}

export interface EmployeePerformance {
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

export interface AdminDashboardData {
  summary: AdminSummary;
  pendingApprovals: AdminPendingApprovals;
  orders: AdminOrders;
  expenses: AdminExpenses;
  incentives: AdminIncentives;
  visits: AdminVisits;
  customers: AdminCustomers;
  employeePerformance: EmployeePerformance[];
}

export interface EmployeeSummary {
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

export interface EmployeeCustomers {
  total: number;
  active: number;
  inactive: number;
}

export interface EmployeeRecentVisit {
  id: string;
  customerName: string;
  visitDate: string;
  purpose: string;
  result: string;
  followUpDate?: string;
}

export interface EmployeeVisits {
  total: number;
  recent: EmployeeRecentVisit[];
}

export interface EmployeeRecentOrder {
  id: string;
  customerName: string;
  orderDate: string;
  totalAmount: number;
  status: OrderStatus;
  itemsCount: number;
}

export interface EmployeeOrders {
  total: number;
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
  cancelled: number;
  totalValue: number;
  recent: EmployeeRecentOrder[];
}

export interface EmployeeExpenses {
  total: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  rejectedCount: number;
  rejectedAmount: number;
  byType: ExpenseByType[];
}

export interface EmployeeIncentives {
  total: number;
  totalAmount: number;
  unpaidCount: number;
  unpaidAmount: number;
  paidCount: number;
  paidAmount: number;
}

export interface EmployeeDashboardData {
  summary: EmployeeSummary;
  customers: EmployeeCustomers;
  visits: EmployeeVisits;
  orders: EmployeeOrders;
  expenses: EmployeeExpenses;
  incentives: EmployeeIncentives;
}
