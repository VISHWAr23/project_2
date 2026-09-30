// User instruction: "Phase 9: Dashboard - Write comprehensive unit tests for DashboardService"
// Importers/callers: Vitest test runner
// Affected API: DashboardService (getAdminDashboard, getEmployeeDashboard, buildDateRange, getDateMatch, round)
// Data schemas: AdminDashboardDto, EmployeeDashboardDto, QueryDashboardDto

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardService } from './dashboard.service.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { OrderStatus } from '../orders/schemas/order.schema.js';
import {
  ExpenseStatus,
  ExpenseType,
} from '../expenses/schemas/expense.schema.js';
import { IncentiveStatus } from '../incentives/schemas/incentive.schema.js';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockUserModel: any;
  let mockCustomerModel: any;
  let mockVisitModel: any;
  let mockOrderModel: any;
  let mockIncentiveModel: any;
  let mockExpenseModel: any;

  const mockEmployeeId1 = new Types.ObjectId().toString();
  const mockEmployeeId2 = new Types.ObjectId().toString();

  const mockActiveEmployees = [
    {
      _id: new Types.ObjectId(mockEmployeeId1),
      name: 'Alice Johnson',
      email: 'alice@test.com',
      role: UserRole.EMPLOYEE,
      isActive: true,
    },
    {
      _id: new Types.ObjectId(mockEmployeeId2),
      name: 'Bob Smith',
      email: 'bob@test.com',
      role: UserRole.EMPLOYEE,
      isActive: true,
    },
  ];

  beforeEach(() => {
    mockUserModel = {
      find: vi.fn().mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockActiveEmployees),
        }),
      }),
      findById: vi.fn().mockImplementation((id: any) => ({
        lean: vi.fn().mockReturnValue({
          exec: vi
            .fn()
            .mockResolvedValue(
              id.toString() === mockEmployeeId1
                ? mockActiveEmployees[0]
                : id.toString() === mockEmployeeId2
                  ? mockActiveEmployees[1]
                  : null,
            ),
        }),
      })),
    };

    mockCustomerModel = {
      aggregate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            total: [{ count: 10 }],
            byStatus: [
              { _id: 'ACTIVE', count: 8 },
              { _id: 'INACTIVE', count: 2 },
            ],
            byEmployee: [
              { _id: new Types.ObjectId(mockEmployeeId1), count: 6 },
              { _id: new Types.ObjectId(mockEmployeeId2), count: 4 },
            ],
          },
        ]),
      }),
    };

    mockVisitModel = {
      aggregate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            total: [{ count: 25 }],
            byEmployee: [
              { _id: new Types.ObjectId(mockEmployeeId1), count: 15 },
              { _id: new Types.ObjectId(mockEmployeeId2), count: 10 },
            ],
            recent: [
              {
                _id: new Types.ObjectId(),
                visitDate: new Date('2026-03-28T10:00:00Z'),
                purpose: 'Sales pitch',
                result: 'Order placed',
                followUpDate: new Date('2026-04-05T10:00:00Z'),
                customerDoc: [{ customerName: 'Acme Corp' }],
                employeeDoc: [{ name: 'Alice Johnson' }],
              },
            ],
          },
        ]),
      }),
    };

    mockOrderModel = {
      aggregate: vi.fn().mockImplementation((pipeline: any[]) => {
        // Check if it's the pending orders query
        if (pipeline[0]?.$match?.status === OrderStatus.PENDING) {
          return {
            exec: vi
              .fn()
              .mockResolvedValue([{ _id: null, count: 3, totalAmount: 45000 }]),
          };
        }
        return {
          exec: vi.fn().mockResolvedValue([
            {
              byStatus: [
                { _id: OrderStatus.APPROVED, count: 5, totalAmount: 150000 },
                { _id: OrderStatus.COMPLETED, count: 10, totalAmount: 300000 },
                { _id: OrderStatus.PENDING, count: 3, totalAmount: 45000 },
                { _id: OrderStatus.REJECTED, count: 1, totalAmount: 10000 },
                { _id: OrderStatus.CANCELLED, count: 1, totalAmount: 5000 },
              ],
              byEmployee: [
                {
                  _id: new Types.ObjectId(mockEmployeeId1),
                  count: 12,
                  totalAmount: 300000,
                },
                {
                  _id: new Types.ObjectId(mockEmployeeId2),
                  count: 8,
                  totalAmount: 210000,
                },
              ],
              dateWise: [
                { _id: '2026-03-25', count: 4, totalAmount: 100000 },
                { _id: '2026-03-26', count: 6, totalAmount: 200000 },
              ],
              recent: [
                {
                  _id: new Types.ObjectId(),
                  orderDate: new Date('2026-03-28T12:00:00Z'),
                  totalAmount: 50000,
                  status: OrderStatus.APPROVED,
                  items: [{ product: 'P1', quantity: 2 }],
                  customerDoc: [{ businessName: 'Global Tech' }],
                },
              ],
            },
          ]),
        };
      }),
    };

    mockIncentiveModel = {
      aggregate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            byStatus: [
              { _id: IncentiveStatus.PAID, count: 8, totalAmount: 40000 },
              { _id: IncentiveStatus.UNPAID, count: 4, totalAmount: 20000 },
            ],
            byEmployee: [
              {
                _id: new Types.ObjectId(mockEmployeeId1),
                count: 7,
                totalAmount: 35000,
              },
              {
                _id: new Types.ObjectId(mockEmployeeId2),
                count: 5,
                totalAmount: 25000,
              },
            ],
            dateWise: [
              { _id: '2026-03-20', count: 6, totalAmount: 30000 },
              { _id: '2026-03-27', count: 6, totalAmount: 30000 },
            ],
          },
        ]),
      }),
    };

    mockExpenseModel = {
      aggregate: vi.fn().mockImplementation((pipeline: any[]) => {
        // Check if it's the pending expenses query
        if (pipeline[0]?.$match?.status === ExpenseStatus.PENDING) {
          return {
            exec: vi
              .fn()
              .mockResolvedValue([{ _id: null, count: 4, totalAmount: 12000 }]),
          };
        }
        return {
          exec: vi.fn().mockResolvedValue([
            {
              byStatus: [
                { _id: ExpenseStatus.APPROVED, count: 12, totalAmount: 36000 },
                { _id: ExpenseStatus.PENDING, count: 4, totalAmount: 12000 },
                { _id: ExpenseStatus.REJECTED, count: 2, totalAmount: 4000 },
              ],
              byType: [
                { _id: ExpenseType.FUEL, count: 6, totalAmount: 15000 },
                { _id: ExpenseType.TRAVEL, count: 5, totalAmount: 20000 },
                { _id: ExpenseType.FOOD, count: 4, totalAmount: 8000 },
                { _id: ExpenseType.ACCOMMODATION, count: 2, totalAmount: 8000 },
                { _id: ExpenseType.OTHER, count: 1, totalAmount: 1000 },
              ],
              byEmployee: [
                {
                  _id: new Types.ObjectId(mockEmployeeId1),
                  count: 10,
                  totalAmount: 30000,
                },
                {
                  _id: new Types.ObjectId(mockEmployeeId2),
                  count: 8,
                  totalAmount: 22000,
                },
              ],
            },
          ]),
        };
      }),
    };

    service = new DashboardService(
      mockUserModel,
      mockCustomerModel,
      mockVisitModel,
      mockOrderModel,
      mockIncentiveModel,
      mockExpenseModel,
    );
  });

  describe('Utility & Helper Methods', () => {
    it('round() should format numeric values with 2 decimals properly', () => {
      expect(service.round(123.456)).toBe(123.46);
      expect(service.round(100)).toBe(100);
      expect(service.round(0)).toBe(0);
      expect(service.round(NaN as any)).toBe(0);
      expect(service.round(null as any)).toBe(0);
    });

    it('buildDateRange() should handle valid, partial, and invalid dates', () => {
      const full = service.buildDateRange('2026-03-01', '2026-03-31');
      expect(full.start).toBeDefined();
      expect(full.end).toBeDefined();
      expect(full.start?.toISOString()).toContain('2026-03-01T00:00:00.000Z');
      expect(full.end?.toISOString()).toContain('2026-03-31T23:59:59.999Z');

      const onlyStart = service.buildDateRange('2026-03-01', undefined);
      expect(onlyStart.start).toBeDefined();
      expect(onlyStart.end).toBeUndefined();

      const invalid = service.buildDateRange('invalid-date', 'not-a-date');
      expect(invalid.start).toBeUndefined();
      expect(invalid.end).toBeUndefined();
    });

    it('getDateMatch() should construct mongo date filters accurately', () => {
      const start = new Date('2026-01-01T00:00:00.000Z');
      const end = new Date('2026-01-31T23:59:59.999Z');

      const rangeMatch = service.getDateMatch('visitDate', start, end);
      expect(rangeMatch).toEqual({ visitDate: { $gte: start, $lte: end } });

      const startMatch = service.getDateMatch('orderDate', start, undefined);
      expect(startMatch).toEqual({ orderDate: { $gte: start } });

      const endMatch = service.getDateMatch('date', undefined, end);
      expect(endMatch).toEqual({ date: { $lte: end } });

      const emptyMatch = service.getDateMatch(
        'createdAt',
        undefined,
        undefined,
      );
      expect(emptyMatch).toEqual({});
    });
  });

  describe('getAdminDashboard()', () => {
    it('should aggregate company-wide summary, customers, visits, orders, expenses, incentives, and pending approvals', async () => {
      const result = await service.getAdminDashboard({});

      // Summary checks
      expect(result.summary.totalEmployees).toBe(2);
      expect(result.summary.totalCustomers).toBe(10);
      expect(result.summary.totalVisits).toBe(25);
      expect(result.summary.totalOrders).toBe(20);
      expect(result.summary.totalOrderValue).toBe(510000);
      expect(result.summary.totalExpenses).toBe(52000);
      expect(result.summary.totalApprovedExpenseAmount).toBe(36000);
      expect(result.summary.totalPendingExpenseAmount).toBe(12000);
      expect(result.summary.totalIncentives).toBe(60000);
      expect(result.summary.totalPaidIncentives).toBe(40000);
      expect(result.summary.totalUnpaidIncentives).toBe(20000);

      // Pending Approvals
      expect(result.pendingApprovals.pendingOrdersCount).toBe(3);
      expect(result.pendingApprovals.pendingOrdersAmount).toBe(45000);
      expect(result.pendingApprovals.pendingExpensesCount).toBe(4);
      expect(result.pendingApprovals.pendingExpensesAmount).toBe(12000);

      // Orders metrics
      expect(result.orders.totalOrders).toBe(20);
      expect(result.orders.approvedOrders).toBe(5);
      expect(result.orders.completedOrders).toBe(10);
      expect(result.orders.pendingOrders).toBe(3);
      expect(result.orders.rejectedOrders).toBe(1);
      expect(result.orders.cancelledOrders).toBe(1);
      expect(result.orders.approvedOrderValue).toBe(450000); // approved + completed
      expect(result.orders.dateWiseOrderValue.length).toBe(2);

      // Expense breakdown by type
      expect(result.expenses.totalExpenses).toBe(18);
      expect(result.expenses.pendingCount).toBe(4);
      expect(result.expenses.approvedCount).toBe(12);
      expect(result.expenses.byType.length).toBe(5);
      const fuelExpense = result.expenses.byType.find(
        (e) => e.type === ExpenseType.FUEL,
      );
      expect(fuelExpense?.count).toBe(6);
      expect(fuelExpense?.totalAmount).toBe(15000);

      // Incentives breakdown
      expect(result.incentives.totalIncentives).toBe(12);
      expect(result.incentives.paidCount).toBe(8);
      expect(result.incentives.unpaidCount).toBe(4);
      expect(result.incentives.dateWiseIncentives.length).toBe(2);

      // Customer metrics
      expect(result.customers.totalCustomers).toBe(10);
      expect(result.customers.activeCustomers).toBe(8);
      expect(result.customers.inactiveCustomers).toBe(2);
      expect(result.customers.customersByEmployee.length).toBe(2);

      // Visits metrics
      expect(result.visits.totalVisits).toBe(25);
      expect(result.visits.visitsByEmployee.length).toBe(2);
      expect(result.visits.recentVisits.length).toBe(1);
      expect(result.visits.recentVisits[0].customerName).toBe('Acme Corp');
      expect(result.visits.recentVisits[0].employeeName).toBe('Alice Johnson');

      // Employee Performance table
      expect(result.employeePerformance.length).toBe(2);
      const alice = result.employeePerformance.find(
        (e) => e.employeeId === mockEmployeeId1,
      );
      expect(alice).toBeDefined();
      expect(alice?.employeeName).toBe('Alice Johnson');
      expect(alice?.assignedCustomers).toBe(6);
      expect(alice?.visits).toBe(15);
      expect(alice?.orders).toBe(12);
      expect(alice?.orderValue).toBe(300000);
      expect(alice?.approvedIncentives).toBe(35000);
      expect(alice?.totalExpenses).toBe(30000);
    });

    it('should support date range filtering', async () => {
      await service.getAdminDashboard({
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      });

      expect(mockVisitModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              visitDate: expect.any(Object),
            }),
          }),
        ]),
      );
      expect(mockOrderModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              orderDate: expect.any(Object),
            }),
          }),
        ]),
      );
    });

    it('should gracefully handle empty aggregation datasets', async () => {
      mockCustomerModel.aggregate.mockReturnValue({
        exec: vi
          .fn()
          .mockResolvedValue([{ total: [], byStatus: [], byEmployee: [] }]),
      });
      mockVisitModel.aggregate.mockReturnValue({
        exec: vi
          .fn()
          .mockResolvedValue([{ total: [], byEmployee: [], recent: [] }]),
      });
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi
          .fn()
          .mockResolvedValue([{ byStatus: [], byEmployee: [], dateWise: [] }]),
      });
      mockExpenseModel.aggregate.mockReturnValue({
        exec: vi
          .fn()
          .mockResolvedValue([{ byStatus: [], byType: [], byEmployee: [] }]),
      });
      mockIncentiveModel.aggregate.mockReturnValue({
        exec: vi
          .fn()
          .mockResolvedValue([{ byStatus: [], byEmployee: [], dateWise: [] }]),
      });

      const result = await service.getAdminDashboard({});
      expect(result.summary.totalCustomers).toBe(0);
      expect(result.summary.totalVisits).toBe(0);
      expect(result.summary.totalOrders).toBe(0);
      expect(result.summary.totalOrderValue).toBe(0);
      expect(result.orders.totalOrders).toBe(0);
      expect(result.expenses.totalExpenses).toBe(0);
      expect(result.incentives.totalIncentives).toBe(0);
    });
  });

  describe('getEmployeeDashboard()', () => {
    it('should aggregate employee-specific metrics scoped to authenticated user ID', async () => {
      const result = await service.getEmployeeDashboard(mockEmployeeId1, {});

      // Summary
      expect(result.summary.assignedCustomers).toBe(10);
      expect(result.summary.totalVisits).toBe(25);
      expect(result.summary.totalOrders).toBe(20);
      expect(result.summary.totalOrderValue).toBe(510000);
      expect(result.summary.pendingExpensesCount).toBe(4);
      expect(result.summary.pendingExpensesAmount).toBe(12000);
      expect(result.summary.approvedExpensesCount).toBe(12);
      expect(result.summary.approvedExpensesAmount).toBe(36000);
      expect(result.summary.pendingIncentivesCount).toBe(4);
      expect(result.summary.pendingIncentivesAmount).toBe(20000);
      expect(result.summary.paidIncentivesCount).toBe(8);
      expect(result.summary.paidIncentivesAmount).toBe(40000);

      // Scoped Customer metrics
      expect(result.customers.total).toBe(10);
      expect(result.customers.active).toBe(8);
      expect(result.customers.inactive).toBe(2);

      // Scoped Visits & Recent
      expect(result.visits.total).toBe(25);
      expect(result.visits.recent.length).toBe(1);
      expect(result.visits.recent[0].customerName).toBe('Acme Corp');

      // Scoped Orders & Recent
      expect(result.orders.total).toBe(20);
      expect(result.orders.pending).toBe(3);
      expect(result.orders.approved).toBe(5);
      expect(result.orders.completed).toBe(10);
      expect(result.orders.rejected).toBe(1);
      expect(result.orders.cancelled).toBe(1);
      expect(result.orders.recent.length).toBe(1);
      expect(result.orders.recent[0].customerName).toBe('Global Tech');

      // Scoped Expenses & byType
      expect(result.expenses.total).toBe(18);
      expect(result.expenses.byType.length).toBe(5);

      // Scoped Incentives
      expect(result.incentives.total).toBe(12);
      expect(result.incentives.unpaidCount).toBe(4);
      expect(result.incentives.paidCount).toBe(8);
    });

    it('should throw NotFoundException for invalid or nonexistent employee ID', async () => {
      await expect(
        service.getEmployeeDashboard('invalid-id', {}),
      ).rejects.toThrow(NotFoundException);

      const nonExistentId = new Types.ObjectId().toString();
      await expect(
        service.getEmployeeDashboard(nonExistentId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should apply date range filter to employee visits, orders, expenses, and incentives', async () => {
      await service.getEmployeeDashboard(mockEmployeeId1, {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      });

      expect(mockVisitModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              employee: expect.any(Types.ObjectId),
              visitDate: expect.any(Object),
            }),
          }),
        ]),
      );
      expect(mockOrderModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              employee: expect.any(Types.ObjectId),
              orderDate: expect.any(Object),
            }),
          }),
        ]),
      );
      expect(mockExpenseModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              employee: expect.any(Types.ObjectId),
              date: expect.any(Object),
            }),
          }),
        ]),
      );
      expect(mockIncentiveModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              employeeId: expect.any(Types.ObjectId),
              createdAt: expect.any(Object),
            }),
          }),
        ]),
      );
    });
  });
});
