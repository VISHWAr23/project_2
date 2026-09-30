// User instruction: "Phase 9: Dashboard - Write comprehensive unit tests for DashboardController"
// Importers/callers: Vitest test runner
// Affected API: DashboardController (GET /api/dashboard/admin, GET /api/dashboard/employee)
// Data schemas: AdminDashboardDto, EmployeeDashboardDto, QueryDashboardDto, UserRole

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardController } from './dashboard.controller.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { QueryDashboardDto } from './dto/query-dashboard.dto.js';
import { AdminDashboardDto } from './dto/admin-dashboard.dto.js';
import { EmployeeDashboardDto } from './dto/employee-dashboard.dto.js';

describe('DashboardController', () => {
  let controller: DashboardController;
  let mockDashboardService: any;

  const mockAdminUser = {
    userId: '999999999999999999999999',
    role: UserRole.ADMIN,
    name: 'Admin Master',
    email: 'admin@lathikka.com',
  };

  const mockEmployeeUser = {
    userId: '654321654321654321654321',
    role: UserRole.EMPLOYEE,
    name: 'Sales Rep 1',
    email: 'rep1@lathikka.com',
  };

  const mockAdminDashboardData: AdminDashboardDto = {
    summary: {
      totalEmployees: 5,
      totalCustomers: 50,
      totalVisits: 120,
      totalOrders: 40,
      totalOrderValue: 850000,
      totalExpenses: 65000,
      totalApprovedExpenseAmount: 45000,
      totalPendingExpenseAmount: 15000,
      totalIncentives: 80000,
      totalPaidIncentives: 50000,
      totalUnpaidIncentives: 30000,
    },
    pendingApprovals: {
      pendingOrdersCount: 5,
      pendingOrdersAmount: 75000,
      pendingExpensesCount: 3,
      pendingExpensesAmount: 15000,
    },
    orders: {
      totalOrders: 40,
      approvedOrders: 20,
      completedOrders: 15,
      pendingOrders: 5,
      rejectedOrders: 0,
      cancelledOrders: 0,
      totalOrderValue: 850000,
      approvedOrderValue: 775000,
      dateWiseOrderValue: [],
    },
    expenses: {
      totalExpenses: 25,
      totalAmount: 65000,
      pendingCount: 3,
      pendingAmount: 15000,
      approvedCount: 20,
      approvedAmount: 45000,
      rejectedCount: 2,
      rejectedAmount: 5000,
      byType: [],
    },
    incentives: {
      totalIncentives: 15,
      totalAmount: 80000,
      unpaidCount: 5,
      unpaidAmount: 30000,
      paidCount: 10,
      paidAmount: 50000,
      dateWiseIncentives: [],
    },
    visits: {
      totalVisits: 120,
      visitsByEmployee: [],
      recentVisits: [],
    },
    customers: {
      totalCustomers: 50,
      activeCustomers: 45,
      inactiveCustomers: 5,
      customersByEmployee: [],
    },
    employeePerformance: [],
  };

  const mockEmployeeDashboardData: EmployeeDashboardDto = {
    summary: {
      assignedCustomers: 12,
      totalVisits: 28,
      totalOrders: 10,
      totalOrderValue: 220000,
      pendingExpensesCount: 1,
      pendingExpensesAmount: 3500,
      approvedExpensesCount: 6,
      approvedExpensesAmount: 18000,
      pendingIncentivesCount: 2,
      pendingIncentivesAmount: 10000,
      paidIncentivesCount: 4,
      paidIncentivesAmount: 20000,
    },
    customers: {
      total: 12,
      active: 10,
      inactive: 2,
    },
    visits: {
      total: 28,
      recent: [],
    },
    orders: {
      total: 10,
      pending: 2,
      approved: 5,
      completed: 3,
      rejected: 0,
      cancelled: 0,
      totalValue: 220000,
      recent: [],
    },
    expenses: {
      total: 7,
      totalAmount: 21500,
      pendingCount: 1,
      pendingAmount: 3500,
      approvedCount: 6,
      approvedAmount: 18000,
      rejectedCount: 0,
      rejectedAmount: 0,
      byType: [],
    },
    incentives: {
      total: 6,
      totalAmount: 30000,
      unpaidCount: 2,
      unpaidAmount: 10000,
      paidCount: 4,
      paidAmount: 20000,
    },
  };

  beforeEach(() => {
    mockDashboardService = {
      getAdminDashboard: vi.fn().mockResolvedValue(mockAdminDashboardData),
      getEmployeeDashboard: vi
        .fn()
        .mockResolvedValue(mockEmployeeDashboardData),
    };

    controller = new DashboardController(mockDashboardService);
  });

  describe('getAdminDashboard', () => {
    it('should call dashboardService.getAdminDashboard with query filters', async () => {
      const query: QueryDashboardDto = {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      };

      const result = await controller.getAdminDashboard(query);

      expect(mockDashboardService.getAdminDashboard).toHaveBeenCalledWith(
        query,
      );
      expect(result).toEqual(mockAdminDashboardData);
    });
  });

  describe('getEmployeeDashboard', () => {
    it('should extract employee ID strictly from JWT token user and delegate to service', async () => {
      const query: QueryDashboardDto = {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      };

      const result = await controller.getEmployeeDashboard(
        mockEmployeeUser,
        query,
      );

      expect(mockDashboardService.getEmployeeDashboard).toHaveBeenCalledWith(
        mockEmployeeUser.userId,
        query,
      );
      expect(result).toEqual(mockEmployeeDashboardData);
    });

    it('should handle JWT user payload having sub or _id format', async () => {
      const userWithSub = {
        sub: '654321654321654321654329',
        role: UserRole.EMPLOYEE,
      };
      await controller.getEmployeeDashboard(userWithSub, {});
      expect(mockDashboardService.getEmployeeDashboard).toHaveBeenCalledWith(
        '654321654321654321654329',
        {},
      );

      const userWithObjectId = {
        _id: '654321654321654321654328',
        role: UserRole.EMPLOYEE,
      };
      await controller.getEmployeeDashboard(userWithObjectId, {});
      expect(mockDashboardService.getEmployeeDashboard).toHaveBeenCalledWith(
        '654321654321654321654328',
        {},
      );
    });
  });
});
