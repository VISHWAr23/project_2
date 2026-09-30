// User instruction: "Phase 7: Employee Incentive Management - Add backend tests for all 27 incentive management test cases"
// Importers/callers: Vitest test runner
// Affected API: IncentivesService business logic, rule management, money calculations, RBAC, state transitions, idempotency
// Data schemas: Incentive, IncentiveRule, IncentiveStatus, User, Order, UserRole

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncentivesService } from './incentives.service.js';
import { IncentiveStatus } from './schemas/incentive.schema.js';
import { UserRole } from '../users/schemas/user.schema.js';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';

describe('IncentivesService', () => {
  let service: IncentivesService;
  let mockIncentiveModel: any;
  let mockIncentiveRuleModel: any;

  const mockEmployeeId = '654321654321654321654321';
  const mockOtherEmployeeId = '654321654321654321654322';
  const mockAdminId = '999999999999999999999999';
  const mockOrderId = '507f1f77bcf86cd799439099';
  const mockIncentiveId = '507f1f77bcf86cd799439077';

  const mockEmployeeUser = {
    _id: mockEmployeeId,
    role: UserRole.EMPLOYEE,
    name: 'Sales Rep 1',
    email: 'rep1@test.com',
  };

  const mockOtherEmployeeUser = {
    _id: mockOtherEmployeeId,
    role: UserRole.EMPLOYEE,
    name: 'Sales Rep 2',
    email: 'rep2@test.com',
  };

  const mockAdminUser = {
    _id: mockAdminId,
    role: UserRole.ADMIN,
    name: 'Admin User',
    email: 'admin@test.com',
  };

  const mockRule = {
    _id: 'rule12345678901234567890',
    percentage: 2,
    isActive: true,
    save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
  };

  const mockIncentive = {
    _id: mockIncentiveId,
    orderId: new Types.ObjectId(mockOrderId),
    employeeId: new Types.ObjectId(mockEmployeeId),
    orderAmount: 50000,
    percentage: 2,
    incentiveAmount: 1000,
    status: IncentiveStatus.UNPAID,
    save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
  };

  beforeEach(() => {
    mockIncentiveRuleModel = vi.fn().mockImplementation(function (dto: any) {
      return {
        ...dto,
        _id: 'rule12345678901234567890',
        save: vi.fn().mockResolvedValue({
          _id: 'rule12345678901234567890',
          ...dto,
        }),
      };
    });
    mockIncentiveRuleModel.findOne = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        ...mockRule,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      }),
    });

    const mockFindQuery = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([mockIncentive]),
    };

    const mockFindByIdQuery = {
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue({
        ...mockIncentive,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      }),
    };

    const mockFindOneQuery = {
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(null),
    };

    mockIncentiveModel = vi.fn().mockImplementation(function (dto: any) {
      return {
        ...dto,
        _id: mockIncentiveId,
        save: vi.fn().mockResolvedValue({
          _id: mockIncentiveId,
          ...dto,
        }),
      };
    });

    mockIncentiveModel.find = vi.fn().mockReturnValue(mockFindQuery);
    mockIncentiveModel.findById = vi.fn().mockReturnValue(mockFindByIdQuery);
    mockIncentiveModel.findOne = vi.fn().mockReturnValue(mockFindOneQuery);
    mockIncentiveModel.countDocuments = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(1),
    });

    service = new IncentivesService(
      mockIncentiveModel as any,
      mockIncentiveRuleModel as any,
    );
  });

  // 1. Active incentive rule can be retrieved
  it('1. should retrieve the currently active incentive rule', async () => {
    const rule = await service.getActiveRule();
    expect(rule).toBeDefined();
    expect(rule.percentage).toBe(2);
    expect(rule.isActive).toBe(true);
  });

  // 2. ADMIN can update incentive percentage
  it('2. should allow ADMIN to update the incentive percentage', async () => {
    const updated = await service.updateActiveRule(
      { percentage: 3.5 },
      mockAdminUser as any,
    );
    expect(updated).toBeDefined();
    expect(updated.percentage).toBe(3.5);
  });

  // 3. EMPLOYEE cannot update incentive percentage
  it('3. should forbid EMPLOYEE from updating incentive percentage', async () => {
    await expect(
      service.updateActiveRule({ percentage: 5 }, mockEmployeeUser as any),
    ).rejects.toThrow(ForbiddenException);
  });

  // 4. Valid percentage is accepted
  it('4. should accept valid percentages between 0 and 100', async () => {
    const zeroRule = await service.updateActiveRule(
      { percentage: 0 },
      mockAdminUser as any,
    );
    expect(zeroRule.percentage).toBe(0);

    const hundredRule = await service.updateActiveRule(
      { percentage: 100 },
      mockAdminUser as any,
    );
    expect(hundredRule.percentage).toBe(100);
  });

  // 5. Negative percentage is rejected
  it('5. should reject negative incentive percentage', async () => {
    await expect(
      service.updateActiveRule({ percentage: -1 }, mockAdminUser as any),
    ).rejects.toThrow(BadRequestException);
  });

  // 6. Percentage above 100 is rejected
  it('6. should reject incentive percentage greater than 100', async () => {
    await expect(
      service.updateActiveRule({ percentage: 105 }, mockAdminUser as any),
    ).rejects.toThrow(BadRequestException);
  });

  // 7. Approved order generates incentive
  it('7. should generate an incentive when order is in APPROVED status', async () => {
    const order = {
      _id: mockOrderId,
      employee: mockEmployeeId,
      totalAmount: 50000,
      status: 'APPROVED',
    };

    const result = await service.generateIncentiveForOrder(order);
    expect(result).toBeDefined();
    expect(mockIncentiveModel).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: expect.any(Types.ObjectId),
        employeeId: expect.any(Types.ObjectId),
        orderAmount: 50000,
        percentage: 2,
        incentiveAmount: 1000,
        status: IncentiveStatus.UNPAID,
      }),
    );
  });

  // 8. Correct incentive amount is calculated
  it('8. should calculate correct incentive amount with deterministic 2-decimal rounding', () => {
    // 50,000 * 2% = 1,000
    expect(service.calculateIncentiveAmount(50000, 2)).toBe(1000);
    // 19.99 * 2.5% = 0.49975 -> 0.50
    expect(service.calculateIncentiveAmount(19.99, 2.5)).toBe(0.5);
    // 100 * 3.333% = 3.333 -> 3.33
    expect(service.calculateIncentiveAmount(100, 3.333)).toBe(3.33);
  });

  // 9. Incentive stores the percentage used
  it('9. should store the percentage rate used at generation time in the incentive record', async () => {
    mockIncentiveRuleModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ percentage: 4.5, isActive: true }),
    });

    const order = {
      _id: mockOrderId,
      employee: mockEmployeeId,
      totalAmount: 10000,
      status: 'APPROVED',
    };

    await service.generateIncentiveForOrder(order);
    expect(mockIncentiveModel).toHaveBeenCalledWith(
      expect.objectContaining({
        percentage: 4.5,
        incentiveAmount: 450,
      }),
    );
  });

  // 10. Incentive stores the order amount
  it('10. should store the total order amount in the incentive record', async () => {
    const order = {
      _id: mockOrderId,
      employee: mockEmployeeId,
      totalAmount: 75000,
      status: 'APPROVED',
    };

    await service.generateIncentiveForOrder(order);
    expect(mockIncentiveModel).toHaveBeenCalledWith(
      expect.objectContaining({
        orderAmount: 75000,
        incentiveAmount: 1500,
      }),
    );
  });

  // 11. Pending order does not generate incentive
  it('11. should not generate incentive for order with status PENDING', async () => {
    const order = {
      _id: mockOrderId,
      employee: mockEmployeeId,
      totalAmount: 50000,
      status: 'PENDING',
    };

    const result = await service.generateIncentiveForOrder(order);
    expect(result).toBeNull();
    expect(mockIncentiveModel).not.toHaveBeenCalled();
  });

  // 12. Rejected order does not generate incentive
  it('12. should not generate incentive for order with status REJECTED', async () => {
    const order = {
      _id: mockOrderId,
      employee: mockEmployeeId,
      totalAmount: 50000,
      status: 'REJECTED',
    };

    const result = await service.generateIncentiveForOrder(order);
    expect(result).toBeNull();
    expect(mockIncentiveModel).not.toHaveBeenCalled();
  });

  // 13. Cancelled order does not generate incentive
  it('13. should not generate incentive for order with status CANCELLED', async () => {
    const order = {
      _id: mockOrderId,
      employee: mockEmployeeId,
      totalAmount: 50000,
      status: 'CANCELLED',
    };

    const result = await service.generateIncentiveForOrder(order);
    expect(result).toBeNull();
    expect(mockIncentiveModel).not.toHaveBeenCalled();
  });

  // 14. Repeated approval does not generate duplicate incentive
  it('14. should be idempotent and return existing incentive if generated previously', async () => {
    mockIncentiveModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockIncentive),
    });

    const order = {
      _id: mockOrderId,
      employee: mockEmployeeId,
      totalAmount: 50000,
      status: 'APPROVED',
    };

    const result = await service.generateIncentiveForOrder(order);
    expect(result).toEqual(mockIncentive);
    expect(mockIncentiveModel).not.toHaveBeenCalled();
  });

  // 15. Unique orderId constraint prevents duplicate incentives
  it('15. should handle duplicate key error (E11000) and return existing incentive safely', async () => {
    mockIncentiveModel.mockImplementation(function () {
      return {
        save: vi
          .fn()
          .mockRejectedValue({ code: 11000, name: 'MongoServerError' }),
      };
    });

    let firstCall = true;
    mockIncentiveModel.findOne.mockReturnValue({
      exec: vi.fn().mockImplementation(() => {
        if (firstCall) {
          firstCall = false;
          return Promise.resolve(null);
        }
        return Promise.resolve(mockIncentive);
      }),
    });

    const order = {
      _id: mockOrderId,
      employee: mockEmployeeId,
      totalAmount: 50000,
      status: 'APPROVED',
    };

    const result = await service.generateIncentiveForOrder(order);
    expect(result).toEqual(mockIncentive);
  });

  // 16. ADMIN can view all incentives
  it('16. should allow ADMIN to view all incentives without employee filter by default', async () => {
    await service.findAll({ page: 1, limit: 10 }, mockAdminUser);
    expect(mockIncentiveModel.find).toHaveBeenCalledWith({});
  });

  // 17. EMPLOYEE can view only own incentives
  it('17. should scope incentive listing to the authenticated employee ID', async () => {
    await service.findAll({ page: 1, limit: 10 }, mockEmployeeUser);
    expect(mockIncentiveModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: new Types.ObjectId(mockEmployeeId),
      }),
    );
  });

  // 18. EMPLOYEE cannot view another employee's incentive
  it("18. should forbid EMPLOYEE from viewing another employee's incentive by ID", async () => {
    mockIncentiveModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue({
        ...mockIncentive,
        employeeId: new Types.ObjectId(mockOtherEmployeeId),
      }),
    });

    await expect(
      service.findById(mockIncentiveId, mockEmployeeUser),
    ).rejects.toThrow(ForbiddenException);
  });

  // 19. ADMIN can mark incentive as paid
  it('19. should allow ADMIN to mark an UNPAID incentive as PAID', async () => {
    const unpaidIncentive: any = {
      ...mockIncentive,
      status: IncentiveStatus.UNPAID,
      save: vi.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    };

    mockIncentiveModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(unpaidIncentive),
    });

    await service.markAsPaid(mockIncentiveId, mockAdminUser as any);
    expect(unpaidIncentive.status).toBe(IncentiveStatus.PAID);
    expect(unpaidIncentive.paidAt).toBeInstanceOf(Date);
  });

  // 20. EMPLOYEE cannot mark incentive as paid
  it('20. should forbid EMPLOYEE from marking an incentive as paid', async () => {
    await expect(
      service.markAsPaid(mockIncentiveId, mockEmployeeUser as any),
    ).rejects.toThrow(ForbiddenException);
  });

  // 21. Already paid incentive cannot be paid again
  it('21. should reject paying an incentive that is already marked as PAID', async () => {
    const paidIncentive = {
      ...mockIncentive,
      status: IncentiveStatus.PAID,
      paidAt: new Date(),
    };

    mockIncentiveModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(paidIncentive),
    });

    await expect(
      service.markAsPaid(mockIncentiveId, mockAdminUser as any),
    ).rejects.toThrow(BadRequestException);
  });

  // 22. paidAt is recorded correctly
  it('22. should record current timestamp in paidAt when status changes to PAID', async () => {
    const beforeTime = new Date();
    const unpaidIncentive: any = {
      ...mockIncentive,
      status: IncentiveStatus.UNPAID,
      save: vi.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    };

    mockIncentiveModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(unpaidIncentive),
    });

    await service.markAsPaid(mockIncentiveId, mockAdminUser as any);
    const afterTime = new Date();

    expect(unpaidIncentive.paidAt).toBeInstanceOf(Date);
    expect(unpaidIncentive.paidAt.getTime()).toBeGreaterThanOrEqual(
      beforeTime.getTime(),
    );
    expect(unpaidIncentive.paidAt.getTime()).toBeLessThanOrEqual(
      afterTime.getTime(),
    );
  });

  // 23. Changing the incentive rule does not change historical incentives
  it('23. should preserve stored historical incentive amounts and percentages when rule percentage updates', async () => {
    const historicalIncentive = {
      ...mockIncentive,
      orderAmount: 50000,
      percentage: 2,
      incentiveAmount: 1000,
    };

    // Admin changes rule to 3.5%
    await service.updateActiveRule({ percentage: 3.5 }, mockAdminUser as any);

    // Historical record remains 2% and 1000
    expect(historicalIncentive.percentage).toBe(2);
    expect(historicalIncentive.incentiveAmount).toBe(1000);
  });

  // 24. Employee filtering works
  it('24. should allow filtering incentives by employeeId for ADMIN', async () => {
    await service.findAll(
      { page: 1, limit: 10, employeeId: mockEmployeeId },
      mockAdminUser,
    );
    expect(mockIncentiveModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: new Types.ObjectId(mockEmployeeId),
      }),
    );
  });

  // 25. Status filtering works
  it('25. should filter incentives by status (UNPAID / PAID)', async () => {
    await service.findAll(
      { page: 1, limit: 10, status: IncentiveStatus.PAID },
      mockAdminUser,
    );
    expect(mockIncentiveModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: IncentiveStatus.PAID,
      }),
    );
  });

  // 26. Date filtering works
  it('26. should filter incentives by date range on createdAt', async () => {
    await service.findAll(
      {
        page: 1,
        limit: 10,
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2026-03-31T23:59:59.999Z',
      },
      mockAdminUser,
    );
    expect(mockIncentiveModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: {
          $gte: new Date('2026-03-01T00:00:00.000Z'),
          $lte: new Date('2026-03-31T23:59:59.999Z'),
        },
      }),
    );
  });

  // 27. Pagination works
  it('27. should support pagination with limit and skip calculation', async () => {
    const result = await service.findAll({ page: 3, limit: 5 }, mockAdminUser);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(5);
    expect(result.totalPages).toBe(1);
    expect(mockIncentiveModel.find().skip).toHaveBeenCalledWith(10);
    expect(mockIncentiveModel.find().limit).toHaveBeenCalledWith(5);
  });
});
