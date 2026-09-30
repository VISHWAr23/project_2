// User instruction: "Phase 6: Order Management - Add backend tests for all 28 order management test cases"
// Importers/callers: Vitest test runner
// Affected API: OrdersService business rules, RBAC, state machine, money calculations, validation
// Data schemas: Order, Customer, User, OrderStatus, UserRole

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrdersService } from './orders.service.js';
import { OrderStatus } from './schemas/order.schema.js';
import { UserRole } from '../users/schemas/user.schema.js';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockOrderModel: any;
  let mockCustomerModel: any;
  let mockUserModel: any;

  const mockEmployeeId = '654321654321654321654321';
  const mockOtherEmployeeId = '654321654321654321654322';
  const mockAdminId = '999999999999999999999999';
  const mockCustomerId = '507f1f77bcf86cd799439011';
  const mockOrderId = '507f1f77bcf86cd799439099';

  const mockEmployeeUser = {
    _id: mockEmployeeId,
    role: UserRole.EMPLOYEE,
    name: 'Sales Rep 1',
    email: 'rep1@test.com',
    isActive: true,
  };

  const mockAdminUser = {
    _id: mockAdminId,
    role: UserRole.ADMIN,
    name: 'Admin User',
    email: 'admin@test.com',
    isActive: true,
  };

  const mockCustomer = {
    _id: mockCustomerId,
    customerName: 'Acme Corp',
    businessName: 'Acme Retailers',
    assignedEmployee: new Types.ObjectId(mockEmployeeId),
    status: 'ACTIVE',
  };

  const mockOrder = {
    _id: mockOrderId,
    customer: new Types.ObjectId(mockCustomerId),
    employee: new Types.ObjectId(mockEmployeeId),
    orderDate: new Date('2026-03-01T10:00:00.000Z'),
    items: [
      {
        productName: 'Product A',
        quantity: 5,
        unitPrice: 100,
        totalPrice: 500,
      },
    ],
    totalAmount: 500,
    status: OrderStatus.PENDING,
    save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
  };

  beforeEach(() => {
    mockCustomerModel = {
      findById: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue({ ...mockCustomer }),
      }),
    };

    mockUserModel = {
      findById: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue({ ...mockEmployeeUser }),
      }),
    };

    const mockFindQuery = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([mockOrder]),
    };

    const mockFindByIdQuery = {
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue({
        ...mockOrder,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      }),
    };

    mockOrderModel = vi.fn().mockImplementation(function (dto: any) {
      return {
        ...dto,
        _id: mockOrderId,
        save: vi.fn().mockResolvedValue({
          _id: mockOrderId,
          ...dto,
        }),
      };
    });

    mockOrderModel.find = vi.fn().mockReturnValue(mockFindQuery);
    mockOrderModel.findById = vi.fn().mockReturnValue(mockFindByIdQuery);
    mockOrderModel.countDocuments = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(1),
    });

    service = new OrdersService(
      mockOrderModel as any,
      mockCustomerModel as any,
      mockUserModel as any,
    );
  });

  // 1. Employee creates valid order
  it('1. should allow employee to create a valid order with backend calculations', async () => {
    const dto = {
      customer: mockCustomerId,
      items: [{ productName: 'Widget A', quantity: 2, unitPrice: 150 }],
    };

    const result = await service.create(dto as any, mockEmployeeUser);
    expect(result).toBeDefined();
    expect(mockOrderModel).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: expect.any(Types.ObjectId),
        employee: expect.any(Types.ObjectId),
        totalAmount: 300,
        status: OrderStatus.PENDING,
        items: [
          {
            productName: 'Widget A',
            quantity: 2,
            unitPrice: 150,
            totalPrice: 300,
          },
        ],
      }),
    );
  });

  // 2. Employee cannot create order for another employee's customer
  it("2. should forbid employee from creating order for another employee's customer", async () => {
    mockCustomerModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        ...mockCustomer,
        assignedEmployee: new Types.ObjectId(mockOtherEmployeeId),
      }),
    });

    const dto = {
      customer: mockCustomerId,
      items: [{ productName: 'Widget A', quantity: 1, unitPrice: 100 }],
    };

    await expect(service.create(dto as any, mockEmployeeUser)).rejects.toThrow(
      ForbiddenException,
    );
  });

  // 3. Employee can list own orders
  it('3. should filter orders by employee ID when an employee requests list', async () => {
    await service.findAll({ page: 1, limit: 10 }, mockEmployeeUser);
    expect(mockOrderModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        employee: expect.any(Types.ObjectId),
      }),
    );
  });

  // 4. Employee cannot list another employee's orders (query employeeId is ignored/overridden)
  it("4. should ignore requested employeeId query and enforce employee's own ID", async () => {
    await service.findAll(
      { page: 1, limit: 10, employeeId: mockOtherEmployeeId },
      mockEmployeeUser,
    );
    expect(mockOrderModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        employee: new Types.ObjectId(mockEmployeeId),
      }),
    );
  });

  // 5. Employee cannot access another employee's order
  it("5. should forbid employee from viewing another employee's order by ID", async () => {
    mockOrderModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue({
        ...mockOrder,
        employee: new Types.ObjectId(mockOtherEmployeeId),
      }),
    });

    await expect(
      service.findById(mockOrderId, mockEmployeeUser),
    ).rejects.toThrow(ForbiddenException);
  });

  // 6. Admin can list all orders
  it('6. should allow admin to view all orders without forced employee filter', async () => {
    await service.findAll({ page: 1, limit: 10 }, mockAdminUser);
    expect(mockOrderModel.find).toHaveBeenCalledWith({});
  });

  // 7. Admin can approve pending order
  it('7. should allow admin to approve a pending order', async () => {
    const pendingOrder: any = {
      ...mockOrder,
      status: OrderStatus.PENDING,
      save: vi.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    };
    mockOrderModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(pendingOrder),
    });

    await service.approve(mockOrderId, mockAdminUser as any);
    expect(pendingOrder.status).toBe(OrderStatus.APPROVED);
    expect(pendingOrder.approvedBy).toEqual(new Types.ObjectId(mockAdminId));
    expect(pendingOrder.approvedAt).toBeInstanceOf(Date);
  });

  // 8. Admin can reject pending order
  it('8. should allow admin to reject a pending order with optional reason', async () => {
    const pendingOrder: any = {
      ...mockOrder,
      status: OrderStatus.PENDING,
      save: vi.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    };
    mockOrderModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(pendingOrder),
    });

    await service.reject(
      mockOrderId,
      { reason: 'Budget limit exceeded' },
      mockAdminUser as any,
    );
    expect(pendingOrder.status).toBe(OrderStatus.REJECTED);
    expect(pendingOrder.rejectionReason).toBe('Budget limit exceeded');
  });

  // 9. Admin can complete approved order
  it('9. should allow admin to complete an approved order', async () => {
    const approvedOrder = {
      ...mockOrder,
      status: OrderStatus.APPROVED,
      save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
    };
    mockOrderModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(approvedOrder),
    });

    await service.complete(mockOrderId, mockAdminUser as any);
    expect(approvedOrder.status).toBe(OrderStatus.COMPLETED);
  });

  // 10. Invalid status transition is rejected
  it('10. should reject invalid state transitions (e.g. PENDING -> COMPLETED)', async () => {
    const pendingOrder = {
      ...mockOrder,
      status: OrderStatus.PENDING,
      save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
    };
    mockOrderModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(pendingOrder),
    });

    await expect(
      service.complete(mockOrderId, mockAdminUser as any),
    ).rejects.toThrow(BadRequestException);
  });

  // 11. Employee cannot approve
  it('11. should forbid employee from approving an order', () => {
    expect(() =>
      service.validateTransition(
        OrderStatus.PENDING,
        OrderStatus.APPROVED,
        UserRole.EMPLOYEE,
      ),
    ).toThrow(ForbiddenException);
  });

  // 12. Employee cannot reject
  it('12. should forbid employee from rejecting an order', () => {
    expect(() =>
      service.validateTransition(
        OrderStatus.PENDING,
        OrderStatus.REJECTED,
        UserRole.EMPLOYEE,
      ),
    ).toThrow(ForbiddenException);
  });

  // 13. Employee cannot directly modify status via update
  it('13. should not allow setting status through general update method', async () => {
    const pendingOrder: any = {
      ...mockOrder,
      status: OrderStatus.PENDING,
      save: vi.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    };
    mockOrderModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(pendingOrder),
    });

    const updatePayload: any = {
      status: OrderStatus.APPROVED,
      notes: 'Updated notes',
    };
    await service.update(mockOrderId, updatePayload, mockEmployeeUser);
    expect(pendingOrder.status).toBe(OrderStatus.PENDING);
    expect(pendingOrder.notes).toBe('Updated notes');
  });

  // 14. Employee cannot modify approved order
  it('14. should reject modification of an already APPROVED order', async () => {
    const approvedOrder = {
      ...mockOrder,
      status: OrderStatus.APPROVED,
      save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
    };
    mockOrderModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(approvedOrder),
    });

    await expect(
      service.update(mockOrderId, { notes: 'New notes' }, mockEmployeeUser),
    ).rejects.toThrow(BadRequestException);
  });

  // 15. Employee cannot modify completed order
  it('15. should reject modification of a COMPLETED order', async () => {
    const completedOrder = {
      ...mockOrder,
      status: OrderStatus.COMPLETED,
      save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
    };
    mockOrderModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(completedOrder),
    });

    await expect(
      service.update(mockOrderId, { notes: 'New notes' }, mockEmployeeUser),
    ).rejects.toThrow(BadRequestException);
  });

  // 16. Backend correctly calculates item totals
  it('16. should calculate item totalPrice as quantity * unitPrice accurately', () => {
    const items = [
      { productName: 'P1', quantity: 3, unitPrice: 19.99 },
      { productName: 'P2', quantity: 10, unitPrice: 5.5 },
    ];
    const { processedItems } = service.calculateTotals(items);
    expect(processedItems[0].totalPrice).toBe(59.97);
    expect(processedItems[1].totalPrice).toBe(55);
  });

  // 17. Backend correctly calculates order total
  it('17. should calculate order totalAmount as sum of item totals rounded to 2 decimals', () => {
    const items = [
      { productName: 'P1', quantity: 3, unitPrice: 19.99 },
      { productName: 'P2', quantity: 10, unitPrice: 5.5 },
    ];
    const { totalAmount } = service.calculateTotals(items);
    expect(totalAmount).toBe(114.97);
  });

  // 18. Invalid quantity is rejected
  it('18. should reject item with non-positive or invalid quantity', () => {
    const items = [{ productName: 'P1', quantity: 0, unitPrice: 100 }];
    expect(() => service.calculateTotals(items)).toThrow(BadRequestException);
  });

  // 19. Invalid price is rejected
  it('19. should reject item with negative unitPrice', () => {
    const items = [{ productName: 'P1', quantity: 1, unitPrice: -50 }];
    expect(() => service.calculateTotals(items)).toThrow(BadRequestException);
  });

  // 20. Empty items array is rejected
  it('20. should reject order with empty items array', () => {
    expect(() => service.calculateTotals([])).toThrow(BadRequestException);
  });

  // 21. Invalid customer is rejected
  it('21. should reject order creation if customer does not exist', async () => {
    mockCustomerModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    });

    const dto = {
      customer: '507f1f77bcf86cd799439099',
      items: [{ productName: 'Item', quantity: 1, unitPrice: 10 }],
    };

    await expect(service.create(dto as any, mockEmployeeUser)).rejects.toThrow(
      BadRequestException,
    );
  });

  // 22. Inactive customer is rejected
  it('22. should reject order creation if customer is inactive', async () => {
    mockCustomerModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        ...mockCustomer,
        status: 'INACTIVE',
      }),
    });

    const dto = {
      customer: mockCustomerId,
      items: [{ productName: 'Item', quantity: 1, unitPrice: 10 }],
    };

    await expect(service.create(dto as any, mockEmployeeUser)).rejects.toThrow(
      BadRequestException,
    );
  });

  // 23. Inactive employee is rejected
  it('23. should reject order creation if authenticated employee is inactive', async () => {
    mockUserModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        ...mockEmployeeUser,
        isActive: false,
      }),
    });

    const dto = {
      customer: mockCustomerId,
      items: [{ productName: 'Item', quantity: 1, unitPrice: 10 }],
    };

    await expect(service.create(dto as any, mockEmployeeUser)).rejects.toThrow(
      BadRequestException,
    );
  });

  // 24. Pagination works
  it('24. should support pagination with limit and skip calculation', async () => {
    const result = await service.findAll({ page: 2, limit: 5 }, mockAdminUser);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.totalPages).toBe(1);
    expect(mockOrderModel.find().skip).toHaveBeenCalledWith(5);
    expect(mockOrderModel.find().limit).toHaveBeenCalledWith(5);
  });

  // 25. Employee filtering works
  it('25. should filter orders by employeeId when requested by admin', async () => {
    await service.findAll(
      { page: 1, limit: 10, employeeId: mockEmployeeId },
      mockAdminUser,
    );
    expect(mockOrderModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        employee: new Types.ObjectId(mockEmployeeId),
      }),
    );
  });

  // 26. Customer filtering works
  it('26. should filter orders by customerId', async () => {
    await service.findAll(
      { page: 1, limit: 10, customerId: mockCustomerId },
      mockAdminUser,
    );
    expect(mockOrderModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: new Types.ObjectId(mockCustomerId),
      }),
    );
  });

  // 27. Status filtering works
  it('27. should filter orders by status', async () => {
    await service.findAll(
      { page: 1, limit: 10, status: OrderStatus.APPROVED },
      mockAdminUser,
    );
    expect(mockOrderModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: OrderStatus.APPROVED,
      }),
    );
  });

  // 28. Date filtering works
  it('28. should filter orders by date range', async () => {
    await service.findAll(
      {
        page: 1,
        limit: 10,
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2026-03-31T23:59:59.999Z',
      },
      mockAdminUser,
    );
    expect(mockOrderModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        orderDate: {
          $gte: new Date('2026-03-01T00:00:00.000Z'),
          $lte: new Date('2026-03-31T23:59:59.999Z'),
        },
      }),
    );
  });
});
