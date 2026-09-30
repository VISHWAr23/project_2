// User instruction: "Phase 10: Reports - Create DTO interfaces for employee visits, orders, sales, expenses, incentives, customer visit history, and date-wise reports"
// Importers/callers: backend/src/reports/reports.service.ts, backend/src/reports/reports.controller.ts, backend/src/reports/reports.service.spec.ts
// Affected API: /api/reports/visits/employees, /api/reports/orders/employees, /api/reports/sales/employees, /api/reports/expenses/employees, /api/reports/incentives/employees, /api/reports/customers/:customerId/visits, /api/reports/date-wise
// Data schemas: EmployeeVisitReportDto, EmployeeOrderReportDto, EmployeeSalesReportDto, EmployeeExpenseReportDto, EmployeeIncentiveReportDto, CustomerVisitHistoryDto, CustomerVisitRecordDto, CustomerSummaryDto, DateWiseReportDto

export interface EmployeeVisitReportDto {
  employeeId: string;
  employeeName: string;
  count: number;
}

export interface EmployeeOrderReportDto {
  employeeId: string;
  employeeName: string;
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

export interface EmployeeSalesReportDto {
  employeeId: string;
  employeeName: string;
  orderCount: number;
  totalOrderValue: number;
  approvedOrderValue: number;
  completedOrderValue: number;
}

export interface EmployeeExpenseReportDto {
  employeeId: string;
  employeeName: string;
  totalSubmittedExpenses: number;
  pendingExpenseAmount: number;
  approvedExpenseAmount: number;
  rejectedExpenseAmount: number;
  expenseCount: number;
}

export interface EmployeeIncentiveReportDto {
  employeeId: string;
  employeeName: string;
  totalIncentives: number;
  unpaidIncentives: number;
  paidIncentives: number;
  incentiveCount: number;
}

export interface CustomerVisitRecordDto {
  id: string;
  visitDate: Date;
  employeeId: string;
  employeeName: string;
  purpose: string;
  notes?: string;
  result: string;
  followUpDate?: Date;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface CustomerSummaryDto {
  id: string;
  customerName: string;
  businessName: string;
  phone: string;
  address: string;
  status: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
}

export interface CustomerVisitHistoryDto {
  customer: CustomerSummaryDto;
  visits: CustomerVisitRecordDto[];
}

export interface DateWiseReportDto {
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
