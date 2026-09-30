// User instruction: "Phase 10: Reports - Create frontend report TypeScript definitions for all 7 reporting dimensions"
// Importers/callers: frontend/src/lib/api/reports.ts, frontend/src/app/reports/page.tsx
// Affected API: /api/reports/*
// Data schemas: EmployeeVisitReport, EmployeeOrderReport, EmployeeSalesReport, EmployeeExpenseReport, EmployeeIncentiveReport, CustomerVisitHistory, CustomerVisitRecord, CustomerSummary, DateWiseReport, QueryReportsParams, QueryCustomerVisitsParams

import type { ExpenseType } from './expense.types';
import type { IncentiveStatus } from './incentive.types';

export interface QueryReportsParams {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  customerId?: string;
  status?: string;
  type?: ExpenseType;
  paymentStatus?: IncentiveStatus;
}

export interface QueryCustomerVisitsParams {
  startDate?: string;
  endDate?: string;
}

export interface EmployeeVisitReport {
  employeeId: string;
  employeeName: string;
  count: number;
}

export interface EmployeeOrderReport {
  employeeId: string;
  employeeName: string;
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

export interface EmployeeSalesReport {
  employeeId: string;
  employeeName: string;
  orderCount: number;
  totalOrderValue: number;
  approvedOrderValue: number;
  completedOrderValue: number;
}

export interface EmployeeExpenseReport {
  employeeId: string;
  employeeName: string;
  totalSubmittedExpenses: number;
  pendingExpenseAmount: number;
  approvedExpenseAmount: number;
  rejectedExpenseAmount: number;
  expenseCount: number;
}

export interface EmployeeIncentiveReport {
  employeeId: string;
  employeeName: string;
  totalIncentives: number;
  unpaidIncentives: number;
  paidIncentives: number;
  incentiveCount: number;
}

export interface CustomerVisitRecord {
  id: string;
  visitDate: string;
  employeeId: string;
  employeeName: string;
  purpose: string;
  notes?: string;
  result: string;
  followUpDate?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface CustomerSummary {
  id: string;
  customerName: string;
  businessName: string;
  phone: string;
  address: string;
  status: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
}

export interface CustomerVisitHistory {
  customer: CustomerSummary;
  visits: CustomerVisitRecord[];
}

export interface DateWiseReport {
  date: string;
  visits: number;
  orders: number;
  orderValue: number;
  approvedOrders: number;
  approvedOrderValue: number;
  completedOrders: number;
  completedOrderValue: number;
  expenses: number;
  expenseCount: number;
  approvedExpenses: number;
  incentives: number;
  incentiveCount: number;
  paidIncentives: number;
}
