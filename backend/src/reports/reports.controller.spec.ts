// User instruction: "Phase 10: Reports - Create ReportsController tests ensuring all controller endpoints delegate properly to ReportsService with user context and query DTOs"
// Importers/callers: Vitest test runner
// Affected API: ReportsController (getEmployeeVisits, getEmployeeOrders, getEmployeeSales, getEmployeeExpenses, getEmployeeIncentives, getCustomerVisitHistory, getDateWiseReport)
// Data schemas: QueryReportsDto, QueryCustomerVisitsDto, EmployeeVisitReportDto, EmployeeOrderReportDto, EmployeeSalesReportDto, EmployeeExpenseReportDto, EmployeeIncentiveReportDto, CustomerVisitHistoryDto, DateWiseReportDto

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { UserRole } from '../users/schemas/user.schema.js';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: ReportsService;

  const mockUser = {
    userId: 'user123',
    email: 'test@example.com',
    role: UserRole.ADMIN,
  };

  beforeEach(() => {
    reportsService = {
      getEmployeeVisits: vi.fn().mockResolvedValue([]),
      getEmployeeOrders: vi.fn().mockResolvedValue([]),
      getEmployeeSales: vi.fn().mockResolvedValue([]),
      getEmployeeExpenses: vi.fn().mockResolvedValue([]),
      getEmployeeIncentives: vi.fn().mockResolvedValue([]),
      getCustomerVisitHistory: vi
        .fn()
        .mockResolvedValue({ customer: {}, visits: [] }),
      getDateWiseReport: vi.fn().mockResolvedValue([]),
    } as unknown as ReportsService;

    controller = new ReportsController(reportsService);
  });

  it('should delegate getEmployeeVisits to service with query and user', async () => {
    const query = { startDate: '2026-09-01' };
    await controller.getEmployeeVisits(query, mockUser);
    expect(reportsService.getEmployeeVisits).toHaveBeenCalledWith(
      query,
      mockUser,
    );
  });

  it('should delegate getEmployeeOrders to service with query and user', async () => {
    const query = { status: 'APPROVED' };
    await controller.getEmployeeOrders(query, mockUser);
    expect(reportsService.getEmployeeOrders).toHaveBeenCalledWith(
      query,
      mockUser,
    );
  });

  it('should delegate getEmployeeSales to service with query and user', async () => {
    const query = { employeeId: 'emp123' };
    await controller.getEmployeeSales(query, mockUser);
    expect(reportsService.getEmployeeSales).toHaveBeenCalledWith(
      query,
      mockUser,
    );
  });

  it('should delegate getEmployeeExpenses to service with query and user', async () => {
    const query = {};
    await controller.getEmployeeExpenses(query, mockUser);
    expect(reportsService.getEmployeeExpenses).toHaveBeenCalledWith(
      query,
      mockUser,
    );
  });

  it('should delegate getEmployeeIncentives to service with query and user', async () => {
    const query = {};
    await controller.getEmployeeIncentives(query, mockUser);
    expect(reportsService.getEmployeeIncentives).toHaveBeenCalledWith(
      query,
      mockUser,
    );
  });

  it('should delegate getCustomerVisitHistory to service with customerId, query, and user', async () => {
    const query = { startDate: '2026-09-01' };
    await controller.getCustomerVisitHistory('cust123', query, mockUser);
    expect(reportsService.getCustomerVisitHistory).toHaveBeenCalledWith(
      'cust123',
      query,
      mockUser,
    );
  });

  it('should delegate getDateWiseReport to service with query and user', async () => {
    const query = { startDate: '2026-09-01', endDate: '2026-09-30' };
    await controller.getDateWiseReport(query, mockUser);
    expect(reportsService.getDateWiseReport).toHaveBeenCalledWith(
      query,
      mockUser,
    );
  });
});
