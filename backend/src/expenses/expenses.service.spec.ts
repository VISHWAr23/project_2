// User instruction: "Phase 8: Expense Management - Add comprehensive backend unit tests for ExpensesService covering all 24 requirements"
// Importers/callers: Vitest test runner
// Affected API: ExpensesService business logic (create, update, approve, reject, findAll, findById, uploadReceipt)
// Data schemas: Expense, ExpenseType, ExpenseStatus, User, UserRole

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpensesService } from './expenses.service.js';
import { ExpenseStatus, ExpenseType } from './schemas/expense.schema.js';
import { UserRole } from '../users/schemas/user.schema.js';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let mockExpenseModel: any;
  let mockUserModel: any;
  let mockStorageService: any;

  const mockEmployeeId = '654321654321654321654321';
  const mockOtherEmployeeId = '654321654321654321654322';
  const mockAdminId = '999999999999999999999999';
  const mockExpenseId = '507f1f77bcf86cd799439011';

  const mockEmployeeUser = {
    _id: mockEmployeeId,
    role: UserRole.EMPLOYEE,
    name: 'Test Employee',
    email: 'employee@test.com',
    isActive: true,
  };

  const mockOtherEmployeeUser = {
    _id: mockOtherEmployeeId,
    role: UserRole.EMPLOYEE,
    name: 'Other Employee',
    email: 'other@test.com',
    isActive: true,
  };

  const mockAdminUser = {
    _id: mockAdminId,
    role: UserRole.ADMIN,
    name: 'Admin User',
    email: 'admin@test.com',
    isActive: true,
  };

  const mockExpense = {
    _id: mockExpenseId,
    employee: new Types.ObjectId(mockEmployeeId),
    date: new Date('2026-03-25T10:00:00Z'),
    type: ExpenseType.TRAVEL,
    amount: 125.5,
    description: 'Client visit travel expenses',
    receiptUrl: 'https://storage.lathikka.com/receipts/rec1.png',
    status: ExpenseStatus.PENDING,
    save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
  };

  beforeEach(() => {
    const mockFindQuery = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([mockExpense]),
    };

    const mockFindByIdQuery = {
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue({
        ...mockExpense,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      }),
    };

    mockExpenseModel = vi.fn().mockImplementation(function (dto: any) {
      return {
        ...dto,
        _id: mockExpenseId,
        save: vi.fn().mockResolvedValue({
          _id: mockExpenseId,
          ...dto,
        }),
      };
    });

    mockExpenseModel.find = vi.fn().mockReturnValue(mockFindQuery);
    mockExpenseModel.findById = vi.fn().mockReturnValue(mockFindByIdQuery);
    mockExpenseModel.countDocuments = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(1),
    });
    mockExpenseModel.aggregate = vi.fn().mockResolvedValue([
      {
        totalAmount: 125.5,
        totalCount: 1,
        pendingAmount: 125.5,
        pendingCount: 1,
        approvedAmount: 0,
        approvedCount: 0,
        rejectedAmount: 0,
        rejectedCount: 0,
      },
    ]);

    mockUserModel = {
      findById: vi.fn().mockImplementation((id: string) => {
        let found = null;
        if (id === mockEmployeeId) found = mockEmployeeUser;
        else if (id === mockOtherEmployeeId) found = mockOtherEmployeeUser;
        else if (id === mockAdminId) found = mockAdminUser;
        return {
          exec: vi.fn().mockResolvedValue(found),
        };
      }),
    };

    mockStorageService = {
      uploadFile: vi.fn().mockResolvedValue({
        url: 'https://storage.lathikka.com/visits/receipt_123.png',
        key: 'visits/receipt_123.png',
        mimetype: 'image/png',
        size: 1024,
      }),
    };

    service = new ExpensesService(
      mockExpenseModel as any,
      mockUserModel as any,
      mockStorageService as any,
    );
  });

  // 1. Create expense as employee sets employee to user ID and status to PENDING
  it('1. should create expense as employee with user ID and default status PENDING', async () => {
    const dto = {
      date: '2026-03-25T10:00:00.000Z',
      type: ExpenseType.FUEL,
      amount: 45.5,
      description: 'Fuel for field visit',
    };

    const result = await service.create(dto as any, mockEmployeeUser);
    expect(result).toBeDefined();
    expect(mockExpenseModel).toHaveBeenCalledWith(
      expect.objectContaining({
        employee: new Types.ObjectId(mockEmployeeId),
        type: ExpenseType.FUEL,
        amount: 45.5,
        status: ExpenseStatus.PENDING,
      }),
    );
  });

  // 2. Create expense rounds amount to 2 decimal places
  it('2. should round expense amount to 2 decimal places deterministically', () => {
    expect(service.calculateAmount(45.556)).toBe(45.56);
    expect(service.calculateAmount(19.991)).toBe(19.99);
    expect(service.calculateAmount(100)).toBe(100);
  });

  // 3. Create expense as admin with target employee
  it('3. should allow admin to create expense on behalf of active employee', async () => {
    const dto = {
      employee: mockEmployeeId,
      date: '2026-03-25T10:00:00.000Z',
      type: ExpenseType.ACCOMMODATION,
      amount: 250.0,
      description: 'Hotel for marketing conference',
    };

    await service.create(dto as any, mockAdminUser);
    expect(mockExpenseModel).toHaveBeenCalledWith(
      expect.objectContaining({
        employee: new Types.ObjectId(mockEmployeeId),
        type: ExpenseType.ACCOMMODATION,
        amount: 250,
      }),
    );
  });

  // 4. Create expense ignores injected status or reviewedBy from client
  it('4. should ignore client-supplied status or reviewer fields during creation', async () => {
    const maliciousDto: any = {
      date: '2026-03-25T10:00:00.000Z',
      type: ExpenseType.OTHER,
      amount: 50.0,
      description: 'Stationery',
      status: ExpenseStatus.APPROVED,
      reviewedBy: mockAdminId,
      reviewedAt: new Date(),
      rejectionReason: 'Fake reason',
    };

    await service.create(maliciousDto, mockEmployeeUser);
    const passedArgs = mockExpenseModel.mock.calls[0][0];
    expect(passedArgs.status).toBe(ExpenseStatus.PENDING);
    expect(passedArgs.reviewedBy).toBeUndefined();
    expect(passedArgs.reviewedAt).toBeUndefined();
    expect(passedArgs.rejectionReason).toBeUndefined();
  });

  // 5. Update pending expense by owner succeeds
  it('5. should allow owner to update a pending expense', async () => {
    const updateDto = {
      amount: 150.0,
      description: 'Updated travel description',
    };

    const updated = await service.update(
      mockExpenseId,
      updateDto,
      mockEmployeeUser,
    );
    expect(updated).toBeDefined();
    expect(mockExpenseModel.findById).toHaveBeenCalledWith(mockExpenseId);
  });

  // 6. Update pending expense by non-owner throws ForbiddenException
  it('6. should forbid non-owner employee from updating expense', async () => {
    const updateDto = { amount: 200.0 };

    await expect(
      service.update(mockExpenseId, updateDto, mockOtherEmployeeUser),
    ).rejects.toThrow(ForbiddenException);
  });

  // 7. Update approved expense throws BadRequestException
  it('7. should reject updating an APPROVED expense', async () => {
    mockExpenseModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
      }),
    });

    await expect(
      service.update(mockExpenseId, { amount: 150 }, mockEmployeeUser),
    ).rejects.toThrow(BadRequestException);
  });

  // 8. Update rejected expense throws BadRequestException
  it('8. should reject updating a REJECTED expense', async () => {
    mockExpenseModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.REJECTED,
      }),
    });

    await expect(
      service.update(mockExpenseId, { amount: 150 }, mockEmployeeUser),
    ).rejects.toThrow(BadRequestException);
  });

  // 9. Approve pending expense by admin transitions to APPROVED, sets reviewedBy and reviewedAt
  it('9. should transition PENDING expense to APPROVED and set reviewer metadata', async () => {
    const pendingExpense: any = {
      ...mockExpense,
      status: ExpenseStatus.PENDING,
      save: vi.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    };

    mockExpenseModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(pendingExpense),
    });

    await service.approve(mockExpenseId, mockAdminUser);
    expect(pendingExpense.status).toBe(ExpenseStatus.APPROVED);
    expect(pendingExpense.reviewedBy).toEqual(new Types.ObjectId(mockAdminId));
    expect(pendingExpense.reviewedAt).toBeInstanceOf(Date);
  });

  // 10. Approve already approved expense throws BadRequestException
  it('10. should reject approving an already APPROVED expense', async () => {
    const approvedExpense = {
      ...mockExpense,
      status: ExpenseStatus.APPROVED,
    };

    mockExpenseModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(approvedExpense),
    });

    await expect(service.approve(mockExpenseId, mockAdminUser)).rejects.toThrow(
      BadRequestException,
    );
  });

  // 11. Approve rejected expense throws BadRequestException
  it('11. should reject approving a terminal REJECTED expense', async () => {
    const rejectedExpense = {
      ...mockExpense,
      status: ExpenseStatus.REJECTED,
    };

    mockExpenseModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(rejectedExpense),
    });

    await expect(service.approve(mockExpenseId, mockAdminUser)).rejects.toThrow(
      BadRequestException,
    );
  });

  // 12. Reject pending expense by admin transitions to REJECTED with rejectionReason
  it('12. should transition PENDING expense to REJECTED with mandatory reason', async () => {
    const pendingExpense: any = {
      ...mockExpense,
      status: ExpenseStatus.PENDING,
      save: vi.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    };

    mockExpenseModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(pendingExpense),
    });

    await service.reject(
      mockExpenseId,
      { reason: 'Receipt is missing total amount' },
      mockAdminUser,
    );

    expect(pendingExpense.status).toBe(ExpenseStatus.REJECTED);
    expect(pendingExpense.reviewedBy).toEqual(new Types.ObjectId(mockAdminId));
    expect(pendingExpense.rejectionReason).toBe(
      'Receipt is missing total amount',
    );
  });

  // 13. Reject without reason throws BadRequestException
  it('13. should reject rejection attempt without reason', async () => {
    await expect(
      service.reject(mockExpenseId, { reason: '' }, mockAdminUser),
    ).rejects.toThrow(BadRequestException);
  });

  // 14. Reject already terminal expense throws BadRequestException
  it('14. should reject rejecting an already APPROVED expense', async () => {
    const approvedExpense = {
      ...mockExpense,
      status: ExpenseStatus.APPROVED,
    };

    mockExpenseModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(approvedExpense),
    });

    await expect(
      service.reject(mockExpenseId, { reason: 'Too late' }, mockAdminUser),
    ).rejects.toThrow(BadRequestException);
  });

  // 15. Employee can only view their own expenses
  it('15. should scope expense listing to authenticated employee', async () => {
    await service.findAll({ page: 1, limit: 10 }, mockEmployeeUser);
    expect(mockExpenseModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        employee: new Types.ObjectId(mockEmployeeId),
      }),
    );
  });

  // 16. Admin can view all expenses and filter by employee
  it('16. should allow admin to view all expenses and filter by employeeId', async () => {
    await service.findAll(
      { page: 1, limit: 10, employeeId: mockEmployeeId },
      mockAdminUser,
    );
    expect(mockExpenseModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        employee: new Types.ObjectId(mockEmployeeId),
      }),
    );
  });

  // 17. Find all calculates correct financial summaries
  it('17. should compute aggregate summary amounts and counts', async () => {
    const result = await service.findAll({ page: 1, limit: 10 }, mockAdminUser);
    expect(result.summary).toBeDefined();
    expect(result.summary.totalAmount).toBe(125.5);
    expect(result.summary.pendingAmount).toBe(125.5);
    expect(result.summary.approvedAmount).toBe(0);
    expect(result.summary.rejectedAmount).toBe(0);
  });

  // 18. Find by ID returns expense for owner
  it('18. should return expense by ID for owner', async () => {
    const result = await service.findById(mockExpenseId, mockEmployeeUser);
    expect(result).toBeDefined();
    expect(mockExpenseModel.findById).toHaveBeenCalledWith(mockExpenseId);
  });

  // 19. Find by ID throws ForbiddenException for non-owner employee
  it('19. should throw ForbiddenException when employee accesses another employee expense', async () => {
    mockExpenseModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue({
        ...mockExpense,
        employee: new Types.ObjectId(mockOtherEmployeeId),
      }),
    });

    await expect(
      service.findById(mockExpenseId, mockEmployeeUser),
    ).rejects.toThrow(ForbiddenException);
  });

  // 20. Find by ID throws NotFoundException for non-existent id
  it('20. should throw NotFoundException when expense does not exist', async () => {
    mockExpenseModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(null),
    });

    await expect(
      service.findById('507f1f77bcf86cd799439099', mockAdminUser),
    ).rejects.toThrow(NotFoundException);
  });

  // 21. Upload receipt validates mime types and size
  it('21. should reject unsupported file format for receipt upload', async () => {
    const invalidFile = {
      buffer: Buffer.from('test'),
      originalname: 'test.exe',
      mimetype: 'application/x-msdownload',
      size: 100,
    };

    await expect(service.uploadReceipt(invalidFile)).rejects.toThrow(
      BadRequestException,
    );
  });

  // 22. Upload receipt calls storageService and returns url and metadata
  it('22. should successfully upload valid receipt image', async () => {
    const validFile = {
      buffer: Buffer.from('image content'),
      originalname: 'receipt.png',
      mimetype: 'image/png',
      size: 1024,
    };

    const result = await service.uploadReceipt(validFile);
    expect(result).toBeDefined();
    expect(result.url).toBe(
      'https://storage.lathikka.com/visits/receipt_123.png',
    );
    expect(mockStorageService.uploadFile).toHaveBeenCalled();
  });

  // 23. Inactive employee cannot create expense
  it('23. should reject expense creation if user is inactive', async () => {
    mockUserModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ ...mockEmployeeUser, isActive: false }),
    });

    await expect(
      service.create(
        {
          date: '2026-03-25',
          type: ExpenseType.FOOD,
          amount: 25.0,
          description: 'Lunch',
        } as any,
        mockEmployeeUser,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // 24. Non-admin cannot approve or reject expense
  it('24. should forbid non-admin from approving or rejecting expenses', async () => {
    await expect(
      service.approve(mockExpenseId, mockEmployeeUser),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      service.reject(mockExpenseId, { reason: 'No' }, mockEmployeeUser),
    ).rejects.toThrow(ForbiddenException);
  });
});
