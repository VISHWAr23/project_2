// User instruction: "Phase 8: Expense Management - Write comprehensive unit tests for ExpensesController verifying all route delegations and RBAC"
// Importers/callers: Vitest test runner
// Affected API: ExpensesController HTTP endpoints (GET /api/expenses, GET /api/expenses/:id, POST /api/expenses, PATCH /api/expenses/:id, PATCH /api/expenses/:id/approve, PATCH /api/expenses/:id/reject, POST /api/expenses/upload)
// Data schemas: CreateExpenseDto, UpdateExpenseDto, QueryExpenseDto, RejectExpenseDto, UserRole

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpensesController } from './expenses.controller.js';
import { ExpenseStatus, ExpenseType } from './schemas/expense.schema.js';
import { UserRole } from '../users/schemas/user.schema.js';

describe('ExpensesController', () => {
  let controller: ExpensesController;
  let mockExpensesService: any;

  const mockUser = {
    _id: '654321654321654321654321',
    role: UserRole.EMPLOYEE,
    name: 'Test Employee',
  };

  const mockAdminUser = {
    _id: '999999999999999999999999',
    role: UserRole.ADMIN,
    name: 'Admin User',
  };

  const mockExpense = {
    _id: '507f1f77bcf86cd799439011',
    employee: mockUser._id,
    date: new Date('2026-03-25T10:00:00Z'),
    type: ExpenseType.FUEL,
    amount: 50.0,
    description: 'Fuel for visit',
    status: ExpenseStatus.PENDING,
  };

  beforeEach(() => {
    mockExpensesService = {
      findAll: vi.fn().mockResolvedValue({
        items: [mockExpense],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        summary: {
          totalAmount: 50.0,
          totalCount: 1,
          pendingAmount: 50.0,
          pendingCount: 1,
          approvedAmount: 0,
          approvedCount: 0,
          rejectedAmount: 0,
          rejectedCount: 0,
        },
      }),
      findById: vi.fn().mockResolvedValue(mockExpense),
      create: vi.fn().mockResolvedValue(mockExpense),
      update: vi.fn().mockResolvedValue({
        ...mockExpense,
        amount: 75.0,
      }),
      approve: vi.fn().mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
        reviewedBy: mockAdminUser._id,
      }),
      reject: vi.fn().mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.REJECTED,
        rejectionReason: 'Invalid bill',
        reviewedBy: mockAdminUser._id,
      }),
      uploadReceipt: vi.fn().mockResolvedValue({
        url: 'https://storage.lathikka.com/expenses/rec123.jpg',
        key: 'expenses/rec123.jpg',
        mimetype: 'image/jpeg',
        size: 2048,
      }),
    };

    controller = new ExpensesController(mockExpensesService);
  });

  it('should find all expenses delegating to service with user context', async () => {
    const query = { page: 1, limit: 10 };
    const result = await controller.findAll(query as any, mockUser);
    expect(result).toBeDefined();
    expect(mockExpensesService.findAll).toHaveBeenCalledWith(query, mockUser);
  });

  it('should find one expense by id delegating to service with user context', async () => {
    const result = await controller.findOne(mockExpense._id, mockUser);
    expect(result).toEqual(mockExpense);
    expect(mockExpensesService.findById).toHaveBeenCalledWith(
      mockExpense._id,
      mockUser,
    );
  });

  it('should create expense delegating to service with user context', async () => {
    const createDto = {
      date: '2026-03-25T10:00:00Z',
      type: ExpenseType.FUEL,
      amount: 50.0,
      description: 'Fuel for visit',
    };
    const result = await controller.create(createDto as any, mockUser);
    expect(result).toEqual(mockExpense);
    expect(mockExpensesService.create).toHaveBeenCalledWith(
      createDto,
      mockUser,
    );
  });

  it('should update expense delegating to service with user context', async () => {
    const updateDto = {
      amount: 75.0,
    };
    const result = await controller.update(
      mockExpense._id,
      updateDto as any,
      mockUser,
    );
    expect(result.amount).toBe(75.0);
    expect(mockExpensesService.update).toHaveBeenCalledWith(
      mockExpense._id,
      updateDto,
      mockUser,
    );
  });

  it('should approve expense as admin delegating to service with admin context', async () => {
    const result = await controller.approve(mockExpense._id, mockAdminUser);
    expect(result.status).toBe(ExpenseStatus.APPROVED);
    expect(mockExpensesService.approve).toHaveBeenCalledWith(
      mockExpense._id,
      mockAdminUser,
    );
  });

  it('should reject expense as admin delegating to service with admin context', async () => {
    const rejectDto = { reason: 'Invalid bill' };
    const result = await controller.reject(
      mockExpense._id,
      rejectDto,
      mockAdminUser,
    );
    expect(result.status).toBe(ExpenseStatus.REJECTED);
    expect(mockExpensesService.reject).toHaveBeenCalledWith(
      mockExpense._id,
      rejectDto,
      mockAdminUser,
    );
  });

  it('should upload receipt file delegating to service', async () => {
    const mockFile = {
      buffer: Buffer.from('test image'),
      originalname: 'receipt.jpg',
      mimetype: 'image/jpeg',
      size: 2048,
    } as any;

    const result = await controller.uploadReceipt(mockFile);
    expect(result.url).toBe('https://storage.lathikka.com/expenses/rec123.jpg');
    expect(mockExpensesService.uploadReceipt).toHaveBeenCalledWith(mockFile);
  });
});
