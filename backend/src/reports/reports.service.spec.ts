// User instruction: "Phase 10: Reports - Write comprehensive unit tests for ReportsService covering all 7 report dimensions, RBAC, date filtering, and edge cases"
// Importers/callers: Vitest test runner
// Affected API: ReportsService (getEmployeeVisits, getEmployeeOrders, getEmployeeSales, getEmployeeExpenses, getEmployeeIncentives, getCustomerVisitHistory, getDateWiseReport)
// Data schemas: User, Customer, Visit, Order, Expense, Incentive, QueryReportsDto, QueryCustomerVisitsDto, EmployeeVisitReportDto, EmployeeOrderReportDto, EmployeeSalesReportDto, EmployeeExpenseReportDto, EmployeeIncentiveReportDto, CustomerVisitHistoryDto, DateWiseReportDto

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportsService } from './reports.service.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { OrderStatus } from '../orders/schemas/order.schema.js';
import {
  ExpenseStatus,
  ExpenseType,
} from '../expenses/schemas/expense.schema.js';
import { IncentiveStatus } from '../incentives/schemas/incentive.schema.js';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockUserModel: any;
  let mockCustomerModel: any;
  let mockVisitModel: any;
  let mockOrderModel: any;
  let mockExpenseModel: any;
  let mockIncentiveModel: any;

  const mockAdminUser = {
    userId: new Types.ObjectId().toString(),
    email: 'admin@test.com',
    role: UserRole.ADMIN,
  };

  const mockEmployeeId1 = new Types.ObjectId().toString();
  const mockEmployeeId2 = new Types.ObjectId().toString();
  const mockCustomerId1 = new Types.ObjectId().toString();

  const mockEmployeeUser1 = {
    userId: mockEmployeeId1,
    email: 'alice@test.com',
    role: UserRole.EMPLOYEE,
  };

  const mockEmployeeUser2 = {
    userId: mockEmployeeId2,
    email: 'bob@test.com',
    role: UserRole.EMPLOYEE,
  };

  beforeEach(() => {
    mockUserModel = {
      findById: vi.fn().mockImplementation((id: any) => ({
        lean: vi.fn().mockReturnValue({
          exec: vi
            .fn()
            .mockResolvedValue(
              id.toString() === mockEmployeeId1
                ? {
                    _id: new Types.ObjectId(mockEmployeeId1),
                    name: 'Alice Johnson',
                    email: 'alice@test.com',
                  }
                : id.toString() === mockEmployeeId2
                  ? {
                      _id: new Types.ObjectId(mockEmployeeId2),
                      name: 'Bob Smith',
                      email: 'bob@test.com',
                    }
                  : null,
            ),
        }),
      })),
    };

    mockCustomerModel = {
      findById: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue({
              _id: new Types.ObjectId(mockCustomerId1),
              customerName: 'Acme Retail',
              businessName: 'Acme Corp',
              phone: '9876543210',
              address: '123 Main St',
              status: 'ACTIVE',
              assignedEmployee: {
                _id: new Types.ObjectId(mockEmployeeId1),
                name: 'Alice Johnson',
              },
            }),
          }),
        }),
      }),
    };

    mockVisitModel = {
      aggregate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      }),
    };

    mockOrderModel = {
      aggregate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      }),
    };

    mockExpenseModel = {
      aggregate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      }),
    };

    mockIncentiveModel = {
      aggregate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      }),
    };

    service = new ReportsService(
      mockUserModel as any,
      mockCustomerModel as any,
      mockVisitModel as any,
      mockOrderModel as any,
      mockExpenseModel as any,
      mockIncentiveModel as any,
    );
  });

  describe('1. Employee-wise Visits Report (getEmployeeVisits)', () => {
    it('should allow ADMIN to retrieve aggregated employee visit report', async () => {
      mockVisitModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            employeeId: mockEmployeeId1,
            employeeName: 'Alice Johnson',
            count: 25,
          },
          { employeeId: mockEmployeeId2, employeeName: 'Bob Smith', count: 18 },
        ]),
      });

      const res = await service.getEmployeeVisits({}, mockAdminUser);
      expect(res).toHaveLength(2);
      expect(res[0].employeeName).toBe('Alice Johnson');
      expect(res[0].count).toBe(25);
      expect(res[1].employeeName).toBe('Bob Smith');
      expect(res[1].count).toBe(18);
    });

    it('should strictly scope report to authenticated EMPLOYEE even if employeeId query is provided', async () => {
      mockVisitModel.aggregate.mockReturnValue({
        exec: vi
          .fn()
          .mockResolvedValue([
            {
              employeeId: mockEmployeeId1,
              employeeName: 'Alice Johnson',
              count: 12,
            },
          ]),
      });

      // Employee 1 attempts to pass Employee 2's ID
      await service.getEmployeeVisits(
        { employeeId: mockEmployeeId2 },
        mockEmployeeUser1,
      );

      const calledPipeline = mockVisitModel.aggregate.mock.calls[0][0];
      const matchStage = calledPipeline[0].$match;
      expect(matchStage.employee.toString()).toBe(mockEmployeeId1);
    });

    it('should handle empty results gracefully and return 0-count row if specific employee exists', async () => {
      mockVisitModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      });

      const res = await service.getEmployeeVisits(
        { employeeId: mockEmployeeId1 },
        mockAdminUser,
      );
      expect(res).toHaveLength(1);
      expect(res[0].employeeId).toBe(mockEmployeeId1);
      expect(res[0].employeeName).toBe('Alice Johnson');
      expect(res[0].count).toBe(0);
    });
  });

  describe('2. Employee-wise Orders Report (getEmployeeOrders)', () => {
    it('should aggregate order counts by status correctly', async () => {
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            employeeId: mockEmployeeId1,
            employeeName: 'Alice Johnson',
            totalOrders: 10,
            statuses: [
              { status: OrderStatus.PENDING, count: 2 },
              { status: OrderStatus.APPROVED, count: 4 },
              { status: OrderStatus.COMPLETED, count: 3 },
              { status: OrderStatus.CANCELLED, count: 1 },
            ],
          },
        ]),
      });

      const res = await service.getEmployeeOrders({}, mockAdminUser);
      expect(res).toHaveLength(1);
      expect(res[0].totalOrders).toBe(10);
      expect(res[0].pendingOrders).toBe(2);
      expect(res[0].approvedOrders).toBe(4);
      expect(res[0].completedOrders).toBe(3);
      expect(res[0].cancelledOrders).toBe(1);
      expect(res[0].rejectedOrders).toBe(0);
    });

    it('should enforce date range filtering on orderDate', async () => {
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      });

      await service.getEmployeeOrders(
        { startDate: '2026-09-01', endDate: '2026-09-30' },
        mockAdminUser,
      );

      const calledPipeline = mockOrderModel.aggregate.mock.calls[0][0];
      const matchStage = calledPipeline[0].$match;
      expect(matchStage.orderDate).toBeDefined();
      expect(matchStage.orderDate.$gte).toBeInstanceOf(Date);
      expect(matchStage.orderDate.$lte).toBeInstanceOf(Date);
    });
  });

  describe('3. Employee-wise Sales Report (getEmployeeSales)', () => {
    it('should use authoritative stored totalAmount and separate approved and completed values', async () => {
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            employeeId: mockEmployeeId1,
            employeeName: 'Alice Johnson',
            orderCount: 5,
            totalOrderValue: 75000.5,
            approvedOrderValue: 45000.25,
            completedOrderValue: 30000.25,
          },
        ]),
      });

      const res = await service.getEmployeeSales({}, mockAdminUser);
      expect(res).toHaveLength(1);
      expect(res[0].orderCount).toBe(5);
      expect(res[0].totalOrderValue).toBe(75000.5);
      expect(res[0].approvedOrderValue).toBe(45000.25);
      expect(res[0].completedOrderValue).toBe(30000.25);
    });
  });

  describe('4. Employee-wise Expenses Report (getEmployeeExpenses)', () => {
    it('should aggregate submitted, pending, approved, and rejected expenses', async () => {
      mockExpenseModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            employeeId: mockEmployeeId1,
            employeeName: 'Alice Johnson',
            expenseCount: 4,
            totalSubmittedExpenses: 12500,
            pendingExpenseAmount: 2500,
            approvedExpenseAmount: 8000,
            rejectedExpenseAmount: 2000,
          },
        ]),
      });

      const res = await service.getEmployeeExpenses({}, mockAdminUser);
      expect(res).toHaveLength(1);
      expect(res[0].expenseCount).toBe(4);
      expect(res[0].totalSubmittedExpenses).toBe(12500);
      expect(res[0].pendingExpenseAmount).toBe(2500);
      expect(res[0].approvedExpenseAmount).toBe(8000);
      expect(res[0].rejectedExpenseAmount).toBe(2000);
    });

    it('should support expense type filter', async () => {
      mockExpenseModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      });

      await service.getEmployeeExpenses(
        { type: ExpenseType.TRAVEL },
        mockAdminUser,
      );

      const calledPipeline = mockExpenseModel.aggregate.mock.calls[0][0];
      const matchStage = calledPipeline[0].$match;
      expect(matchStage.type).toBe(ExpenseType.TRAVEL);
    });
  });

  describe('5. Employee-wise Incentives Report (getEmployeeIncentives)', () => {
    it('should aggregate stored incentive amounts by paid and unpaid status', async () => {
      mockIncentiveModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            employeeId: mockEmployeeId1,
            employeeName: 'Alice Johnson',
            incentiveCount: 3,
            totalIncentives: 4500,
            unpaidIncentives: 1500,
            paidIncentives: 3000,
          },
        ]),
      });

      const res = await service.getEmployeeIncentives({}, mockAdminUser);
      expect(res).toHaveLength(1);
      expect(res[0].incentiveCount).toBe(3);
      expect(res[0].totalIncentives).toBe(4500);
      expect(res[0].unpaidIncentives).toBe(1500);
      expect(res[0].paidIncentives).toBe(3000);
    });
  });

  describe('6. Customer Visit History (getCustomerVisitHistory)', () => {
    it('should allow ADMIN to view any customer visit history sorted newest first', async () => {
      const mockVisitDate = new Date('2026-09-15');
      mockVisitModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            id: 'visit123',
            visitDate: mockVisitDate,
            employeeId: mockEmployeeId1,
            employeeName: 'Alice Johnson',
            purpose: 'Product Demo',
            result: 'Order placed',
            notes: 'Follow up next week',
          },
        ]),
      });

      const res = await service.getCustomerVisitHistory(
        mockCustomerId1,
        {},
        mockAdminUser,
      );

      expect(res.customer.customerName).toBe('Acme Retail');
      expect(res.visits).toHaveLength(1);
      expect(res.visits[0].purpose).toBe('Product Demo');
    });

    it('should allow assigned EMPLOYEE to view visit history for their own customer', async () => {
      mockVisitModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      });

      const res = await service.getCustomerVisitHistory(
        mockCustomerId1,
        {},
        mockEmployeeUser1,
      );

      expect(res.customer.customerName).toBe('Acme Retail');
    });

    it('should throw ForbiddenException if EMPLOYEE attempts to access another employee customer', async () => {
      await expect(
        service.getCustomerVisitHistory(
          mockCustomerId1,
          {},
          mockEmployeeUser2, // Bob trying to view Alice's customer
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if customer is not found', async () => {
      mockCustomerModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(
        service.getCustomerVisitHistory(
          new Types.ObjectId().toString(),
          {},
          mockAdminUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if customer ID is invalid', async () => {
      await expect(
        service.getCustomerVisitHistory('invalid-id', {}, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('7. Date-Wise Report (getDateWiseReport)', () => {
    it('should aggregate visits, orders, expenses, and incentives date-by-date', async () => {
      mockVisitModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          { _id: '2026-09-01', visits: 5 },
          { _id: '2026-09-02', visits: 8 },
        ]),
      });

      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            _id: '2026-09-01',
            orders: 3,
            orderValue: 15000,
            approvedOrders: 2,
            approvedOrderValue: 10000,
            completedOrders: 1,
            completedOrderValue: 5000,
          },
        ]),
      });

      mockExpenseModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            _id: '2026-09-01',
            expenses: 1200,
            expenseCount: 2,
            approvedExpenses: 1200,
          },
        ]),
      });

      mockIncentiveModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            _id: '2026-09-01',
            incentives: 600,
            incentiveCount: 1,
            paidIncentives: 600,
          },
        ]),
      });

      const res = await service.getDateWiseReport({}, mockAdminUser);
      expect(res).toHaveLength(2);
      expect(res[0].date).toBe('2026-09-01');
      expect(res[0].visits).toBe(5);
      expect(res[0].orders).toBe(3);
      expect(res[0].orderValue).toBe(15000);
      expect(res[0].expenses).toBe(1200);
      expect(res[0].incentives).toBe(600);

      expect(res[1].date).toBe('2026-09-02');
      expect(res[1].visits).toBe(8);
      expect(res[1].orders).toBe(0);
    });
  });

  describe('Helper Functions', () => {
    it('round() handles numbers and null/undefined/NaN safely', () => {
      expect(service.round(123.456)).toBe(123.46);
      expect(service.round(100)).toBe(100);
      expect(service.round(NaN)).toBe(0);
      expect(service.round(null as any)).toBe(0);
      expect(service.round(undefined as any)).toBe(0);
    });

    it('buildDateRange() parses valid start and end dates to UTC boundaries', () => {
      const { start, end } = service.buildDateRange('2026-09-01', '2026-09-05');
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeInstanceOf(Date);
      expect(start?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
      expect(end?.toISOString()).toBe('2026-09-05T23:59:59.999Z');
    });

    it('getDateMatch() builds appropriate mongo query ranges', () => {
      const d1 = new Date('2026-09-01');
      const d2 = new Date('2026-09-10');
      expect(service.getDateMatch('visitDate', d1, d2)).toEqual({
        visitDate: { $gte: d1, $lte: d2 },
      });
      expect(service.getDateMatch('visitDate', d1, undefined)).toEqual({
        visitDate: { $gte: d1 },
      });
      expect(service.getDateMatch('visitDate', undefined, d2)).toEqual({
        visitDate: { $lte: d2 },
      });
      expect(service.getDateMatch('visitDate', undefined, undefined)).toEqual(
        {},
      );
    });
  });
});
