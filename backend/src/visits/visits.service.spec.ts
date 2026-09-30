// User instruction: "Phase 5: Customer Visit Management - Add backend tests for 20 security and business rules"
// Importers/callers: Vitest test runner
// Affected API: VisitsService unit tests covering 20 security and business rules
// Data schemas: Visit, Customer, User, UserRole, CreateVisitDto, UpdateVisitDto, QueryVisitDto

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VisitsService } from './visits.service.js';
import { UserRole } from '../users/schemas/user.schema.js';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

describe('VisitsService', () => {
  let service: VisitsService;
  let mockVisitModel: any;
  let mockCustomerModel: any;
  let mockUserModel: any;

  const mockEmployeeId = '654321654321654321654321';
  const mockOtherEmployeeId = '123456123456123456123456';
  const mockAdminId = '999999999999999999999999';
  const mockCustomerId = '507f1f77bcf86cd799439011';
  const mockVisitId = '507f1f77bcf86cd799439099';

  const mockEmployeeUser = {
    _id: mockEmployeeId,
    name: 'Jane Employee',
    email: 'jane@example.com',
    role: UserRole.EMPLOYEE,
    isActive: true,
  };

  const mockOtherEmployeeUser = {
    _id: mockOtherEmployeeId,
    name: 'Bob Employee',
    email: 'bob@example.com',
    role: UserRole.EMPLOYEE,
    isActive: true,
  };

  const mockAdminUser = {
    _id: mockAdminId,
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    isActive: true,
  };

  const mockInactiveEmployeeUser = {
    _id: '888888888888888888888888',
    name: 'Inactive Employee',
    email: 'inactive@example.com',
    role: UserRole.EMPLOYEE,
    isActive: false,
  };

  const mockCustomer = {
    _id: mockCustomerId,
    customerName: 'Acme Corp',
    businessName: 'Acme Hardware',
    phone: '+1234567890',
    address: '123 Main St',
    assignedEmployee: mockEmployeeId,
  };

  const mockVisit = {
    _id: mockVisitId,
    customer: mockCustomerId,
    employee: mockEmployeeId,
    visitDate: new Date('2026-03-01T10:00:00.000Z'),
    purpose: 'Routine checkup',
    notes: 'Discussed stock inventory',
    result: 'Order promised next week',
    followUpDate: new Date('2026-03-08T10:00:00.000Z'),
    photoUrl: 'https://storage.lathikka.com/visits/sample.jpg',
    latitude: 12.9716,
    longitude: 77.5946,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn(),
  };

  beforeEach(() => {
    function MockVisitModel(this: any, dto: any) {
      Object.assign(this, dto);
      this._id = mockVisitId;
      this.createdAt = new Date();
      this.updatedAt = new Date();
      this.save = vi.fn().mockResolvedValue({
        ...dto,
        _id: mockVisitId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    mockVisitModel = MockVisitModel;
    mockVisitModel.find = vi.fn();
    mockVisitModel.findById = vi.fn();
    mockVisitModel.countDocuments = vi.fn();

    mockCustomerModel = {
      findById: vi.fn(),
    };

    mockUserModel = {
      findById: vi.fn(),
    };

    service = new VisitsService(
      mockVisitModel as any,
      mockCustomerModel as any,
      mockUserModel as any,
    );
  });

  describe('1-5, 9, 20. List and Filtering', () => {
    it('1. ADMIN can list all visits', async () => {
      const mockExec = vi.fn().mockResolvedValue([mockVisit]);
      const mockLimit = vi.fn().mockReturnValue({ exec: mockExec });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate2 = vi.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate1 = vi
        .fn()
        .mockReturnValue({ populate: mockPopulate2 });

      mockVisitModel.find.mockReturnValue({ populate: mockPopulate1 });
      mockVisitModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const result = await service.findAll(
        { page: 1, limit: 10 },
        { _id: mockAdminId, role: UserRole.ADMIN },
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockVisitModel.find).toHaveBeenCalledWith({});
    });

    it('3. ADMIN can filter by employee', async () => {
      const mockExec = vi.fn().mockResolvedValue([mockVisit]);
      const mockLimit = vi.fn().mockReturnValue({ exec: mockExec });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate2 = vi.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate1 = vi
        .fn()
        .mockReturnValue({ populate: mockPopulate2 });

      mockVisitModel.find.mockReturnValue({ populate: mockPopulate1 });
      mockVisitModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      await service.findAll(
        { page: 1, limit: 10, employeeId: mockEmployeeId },
        { _id: mockAdminId, role: UserRole.ADMIN },
      );

      expect(mockVisitModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          employee: new Types.ObjectId(mockEmployeeId),
        }),
      );
    });

    it('4. ADMIN can filter by customer', async () => {
      const mockExec = vi.fn().mockResolvedValue([mockVisit]);
      const mockLimit = vi.fn().mockReturnValue({ exec: mockExec });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate2 = vi.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate1 = vi
        .fn()
        .mockReturnValue({ populate: mockPopulate2 });

      mockVisitModel.find.mockReturnValue({ populate: mockPopulate1 });
      mockVisitModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      await service.findAll(
        { page: 1, limit: 10, customerId: mockCustomerId },
        { _id: mockAdminId, role: UserRole.ADMIN },
      );

      expect(mockVisitModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: new Types.ObjectId(mockCustomerId),
        }),
      );
    });

    it('5. ADMIN can filter by date range', async () => {
      const mockExec = vi.fn().mockResolvedValue([mockVisit]);
      const mockLimit = vi.fn().mockReturnValue({ exec: mockExec });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate2 = vi.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate1 = vi
        .fn()
        .mockReturnValue({ populate: mockPopulate2 });

      mockVisitModel.find.mockReturnValue({ populate: mockPopulate1 });
      mockVisitModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-31');

      await service.findAll(
        { page: 1, limit: 10, startDate, endDate },
        { _id: mockAdminId, role: UserRole.ADMIN },
      );

      expect(mockVisitModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          visitDate: {
            $gte: startDate,
            $lte: endDate,
          },
        }),
      );
    });

    it('9. EMPLOYEE can list only their own visits', async () => {
      const mockExec = vi.fn().mockResolvedValue([mockVisit]);
      const mockLimit = vi.fn().mockReturnValue({ exec: mockExec });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate2 = vi.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate1 = vi
        .fn()
        .mockReturnValue({ populate: mockPopulate2 });

      mockVisitModel.find.mockReturnValue({ populate: mockPopulate1 });
      mockVisitModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      await service.findAll(
        { page: 1, limit: 10, employeeId: mockOtherEmployeeId }, // Attemps to bypass by passing another employee ID
        { _id: mockEmployeeId, role: UserRole.EMPLOYEE },
      );

      expect(mockVisitModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          employee: new Types.ObjectId(mockEmployeeId),
        }),
      );
    });

    it('20. Employee/customer filtering works for ADMIN', async () => {
      const mockExec = vi.fn().mockResolvedValue([mockVisit]);
      const mockLimit = vi.fn().mockReturnValue({ exec: mockExec });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate2 = vi.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate1 = vi
        .fn()
        .mockReturnValue({ populate: mockPopulate2 });

      mockVisitModel.find.mockReturnValue({ populate: mockPopulate1 });
      mockVisitModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      await service.findAll(
        {
          page: 1,
          limit: 10,
          employeeId: mockEmployeeId,
          customerId: mockCustomerId,
        },
        { _id: mockAdminId, role: UserRole.ADMIN },
      );

      expect(mockVisitModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          employee: new Types.ObjectId(mockEmployeeId),
          customer: new Types.ObjectId(mockCustomerId),
        }),
      );
    });
  });

  describe('2, 10, 11. View Visit by ID', () => {
    it('2. ADMIN can view any visit', async () => {
      mockVisitModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(mockVisit),
          }),
        }),
      });

      const result = await service.findById(mockVisitId, {
        _id: mockAdminId,
        role: UserRole.ADMIN,
      });

      expect(result).toBeDefined();
      expect(result._id).toBe(mockVisitId);
    });

    it('10. EMPLOYEE can view only their own visits', async () => {
      mockVisitModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue({
              ...mockVisit,
              employee: { _id: mockEmployeeId },
            }),
          }),
        }),
      });

      const result = await service.findById(mockVisitId, {
        _id: mockEmployeeId,
        role: UserRole.EMPLOYEE,
      });

      expect(result).toBeDefined();
    });

    it("11. EMPLOYEE cannot view another employee's visit (Forbidden)", async () => {
      mockVisitModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue({
              ...mockVisit,
              employee: { _id: mockOtherEmployeeId },
            }),
          }),
        }),
      });

      await expect(
        service.findById(mockVisitId, {
          _id: mockEmployeeId,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('6, 7, 8, 12-18. Create Visit Validations and RBAC', () => {
    it('6. ADMIN can create a visit for an active employee', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockCustomer),
      });

      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEmployeeUser),
      });

      mockVisitModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue({
              ...mockVisit,
              _id: mockVisitId,
            }),
          }),
        }),
      });

      const createDto = {
        customer: mockCustomerId,
        employee: mockEmployeeId,
        visitDate: new Date('2026-03-01T10:00:00.000Z'),
        purpose: 'Discussion',
        result: 'Completed',
      };

      const result = await service.create(createDto, {
        _id: mockAdminId,
        role: UserRole.ADMIN,
      });

      expect(result).toBeDefined();
    });

    it('7. ADMIN cannot create a visit for an inactive employee', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockCustomer),
      });

      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockInactiveEmployeeUser),
      });

      const createDto = {
        customer: mockCustomerId,
        employee: mockInactiveEmployeeUser._id,
        visitDate: new Date('2026-03-01T10:00:00.000Z'),
        purpose: 'Discussion',
        result: 'Completed',
      };

      await expect(
        service.create(createDto, {
          _id: mockAdminId,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(createDto, {
          _id: mockAdminId,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow('Cannot assign visit to inactive employee');
    });

    it('8. ADMIN cannot create a visit for a non-existent customer', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const createDto = {
        customer: 'non-existent-id',
        visitDate: new Date('2026-03-01T10:00:00.000Z'),
        purpose: 'Discussion',
        result: 'Completed',
      };

      await expect(
        service.create(createDto, {
          _id: mockAdminId,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(createDto, {
          _id: mockAdminId,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow('Customer does not exist');
    });

    it('12. EMPLOYEE can create a visit for their assigned customer', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockCustomer),
      });

      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEmployeeUser),
      });

      mockVisitModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue({
              ...mockVisit,
              _id: mockVisitId,
            }),
          }),
        }),
      });

      const createDto = {
        customer: mockCustomerId,
        visitDate: new Date('2026-03-01T10:00:00.000Z'),
        purpose: 'Followup',
        result: 'Success',
      };

      const result = await service.create(createDto, {
        _id: mockEmployeeId,
        role: UserRole.EMPLOYEE,
      });

      expect(result).toBeDefined();
    });

    it("13. EMPLOYEE cannot create a visit for another employee's customer (Forbidden)", async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          ...mockCustomer,
          assignedEmployee: mockOtherEmployeeId,
        }),
      });

      const createDto = {
        customer: mockCustomerId,
        visitDate: new Date('2026-03-01T10:00:00.000Z'),
        purpose: 'Followup',
        result: 'Success',
      };

      await expect(
        service.create(createDto, {
          _id: mockEmployeeId,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createDto, {
          _id: mockEmployeeId,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow(
        'You can only create visits for your assigned customers',
      );
    });

    it('14. EMPLOYEE cannot create a visit if inactive', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          ...mockCustomer,
          assignedEmployee: mockInactiveEmployeeUser._id,
        }),
      });

      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockInactiveEmployeeUser),
      });

      const createDto = {
        customer: mockCustomerId,
        visitDate: new Date('2026-03-01T10:00:00.000Z'),
        purpose: 'Followup',
        result: 'Success',
      };

      await expect(
        service.create(createDto, {
          _id: mockInactiveEmployeeUser._id,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(createDto, {
          _id: mockInactiveEmployeeUser._id,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow('Inactive employee cannot create visits');
    });

    it('15. Visit cannot be created with invalid visitDate', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockCustomer),
      });
      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEmployeeUser),
      });

      const createDto = {
        customer: mockCustomerId,
        visitDate: 'invalid-date' as any,
        purpose: 'Followup',
        result: 'Success',
      };

      await expect(
        service.create(createDto, {
          _id: mockEmployeeId,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(createDto, {
          _id: mockEmployeeId,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow('Invalid visit date');
    });

    it('16. Visit cannot be created with invalid followUpDate (earlier than visitDate)', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockCustomer),
      });
      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEmployeeUser),
      });

      const createDto = {
        customer: mockCustomerId,
        visitDate: new Date('2026-03-10T10:00:00.000Z'),
        followUpDate: new Date('2026-03-05T10:00:00.000Z'),
        purpose: 'Followup',
        result: 'Success',
      };

      await expect(
        service.create(createDto, {
          _id: mockEmployeeId,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(createDto, {
          _id: mockEmployeeId,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow('Follow-up date cannot be earlier than visit date');
    });

    it('17. Visit latitude must be between -90 and 90', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockCustomer),
      });
      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEmployeeUser),
      });

      const createDto = {
        customer: mockCustomerId,
        visitDate: new Date('2026-03-10T10:00:00.000Z'),
        purpose: 'Followup',
        result: 'Success',
        latitude: 95,
      };

      await expect(
        service.create(createDto, {
          _id: mockEmployeeId,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(createDto, {
          _id: mockEmployeeId,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow('Latitude must be between -90 and 90');
    });

    it('18. Visit longitude must be between -180 and 180', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockCustomer),
      });
      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEmployeeUser),
      });

      const createDto = {
        customer: mockCustomerId,
        visitDate: new Date('2026-03-10T10:00:00.000Z'),
        purpose: 'Followup',
        result: 'Success',
        longitude: 190,
      };

      await expect(
        service.create(createDto, {
          _id: mockEmployeeId,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(createDto, {
          _id: mockEmployeeId,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow('Longitude must be between -180 and 180');
    });
  });

  describe('19. Customer Visit History', () => {
    it('19. Customer visit history returns sorted descending by visitDate', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockCustomer),
      });

      const mockExec = vi.fn().mockResolvedValue([mockVisit]);
      const mockSort = vi.fn().mockReturnValue({ exec: mockExec });
      const mockPopulate = vi.fn().mockReturnValue({ sort: mockSort });

      mockVisitModel.find.mockReturnValue({ populate: mockPopulate });

      const result = await service.findByCustomer(mockCustomerId, {
        _id: mockEmployeeId,
        role: UserRole.EMPLOYEE,
      });

      expect(mockCustomerModel.findById).toHaveBeenCalledWith(mockCustomerId);
      expect(mockVisitModel.find).toHaveBeenCalledWith({
        customer: new Types.ObjectId(mockCustomerId),
      });
      expect(mockSort).toHaveBeenCalledWith({ visitDate: -1, createdAt: -1 });
      expect(result).toHaveLength(1);
    });

    it('Customer visit history throws Forbidden if employee is not assigned to customer', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          ...mockCustomer,
          assignedEmployee: mockOtherEmployeeId,
        }),
      });

      await expect(
        service.findByCustomer(mockCustomerId, {
          _id: mockEmployeeId,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
