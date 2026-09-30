// User instruction: "Phase 3: Employee Management - Add backend tests"
// Importers/callers: Vitest test runner
// Affected API: EmployeesService unit tests
// Data schemas: User, UserRole, CreateEmployeeDto, UpdateEmployeeDto, UpdateStatusDto, QueryEmployeeDto

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmployeesService } from './employees.service.js';
import { UserRole } from '../users/schemas/user.schema.js';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let mockUserModel: any;

  const mockEmployeeId = '654321654321654321654321';
  const mockOtherEmployeeId = '123456123456123456123456';
  const mockAdminId = '999999999999999999999999';

  const mockEmployee = {
    _id: mockEmployeeId,
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1987654321',
    passwordHash: 'hashed_password_123',
    role: UserRole.EMPLOYEE,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn(),
    toJSON: function (this: any) {
      const copy: any = { ...this };
      delete copy.passwordHash;
      delete copy.save;
      delete copy.toJSON;
      return copy;
    },
  };

  beforeEach(() => {
    function MockModel(this: any, dto: any) {
      Object.assign(this, dto);
      this._id = mockEmployeeId;
      this.createdAt = new Date();
      this.updatedAt = new Date();
      this.save = vi.fn().mockResolvedValue({
        ...dto,
        _id: mockEmployeeId,
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: function (this: any) {
          const copy: any = { ...this };
          delete copy.passwordHash;
          return copy;
        },
      });
    }

    mockUserModel = MockModel;
    mockUserModel.find = vi.fn();
    mockUserModel.findOne = vi.fn();
    mockUserModel.findById = vi.fn();
    mockUserModel.countDocuments = vi.fn();

    service = new EmployeesService(mockUserModel as any);
  });

  describe('findAll', () => {
    it('1. ADMIN can list employees with pagination and filters', async () => {
      const mockQueryExec = vi.fn().mockResolvedValue([mockEmployee]);
      const mockSelect = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              exec: mockQueryExec,
            }),
          }),
        }),
      });

      mockUserModel.find.mockReturnValue({ select: mockSelect });
      mockUserModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'Jane',
        isActive: true,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockUserModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.EMPLOYEE,
          isActive: true,
          $or: expect.any(Array),
        }),
      );
    });
  });

  describe('create', () => {
    it('2. ADMIN can create employee with hashed password and EMPLOYEE role', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const createDto = {
        name: 'New Employee',
        email: 'new@example.com',
        phone: '+1234567890',
        password: 'securePassword123',
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe('New Employee');
      expect(result.email).toBe('new@example.com');
      expect(result.role).toBe(UserRole.EMPLOYEE);
      expect(result.isActive).toBe(true);
      // 12. PasswordHash is never returned
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('11. Duplicate email is rejected during creation', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEmployee),
      });

      const createDto = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1987654321',
        password: 'securePassword123',
      };

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Email is already registered',
      );
    });
  });

  describe('findById', () => {
    it('3. ADMIN can view employee by ID', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEmployee),
      });
      mockUserModel.findOne.mockReturnValue({ select: mockSelect });

      const result = await service.findById(mockEmployeeId);

      expect(result).toBeDefined();
      expect(result._id).toBe(mockEmployeeId);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        _id: mockEmployeeId,
        role: UserRole.EMPLOYEE,
      });
    });

    it('throws NotFoundException if employee does not exist', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });
      mockUserModel.findOne.mockReturnValue({ select: mockSelect });

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('4. ADMIN can update employee details including email', async () => {
      const employeeDoc = {
        ...mockEmployee,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };

      mockUserModel.findOne
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue(employeeDoc),
        })
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue(null), // no conflicting email
        });

      const updateDto = {
        name: 'Jane Updated',
        email: 'jane.new@example.com',
        phone: '+1112223333',
      };

      const result = await service.update(mockEmployeeId, updateDto, {
        _id: mockAdminId,
        role: UserRole.ADMIN,
      });

      expect(result.name).toBe('Jane Updated');
      expect(result.email).toBe('jane.new@example.com');
      expect(result.phone).toBe('+1112223333');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('8. EMPLOYEE can update their own profile name and phone', async () => {
      const employeeDoc = {
        ...mockEmployee,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };

      mockUserModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(employeeDoc),
      });

      const updateDto = {
        name: 'Jane Self-Update',
        phone: '+9998887777',
      };

      const result = await service.update(mockEmployeeId, updateDto, {
        _id: mockEmployeeId,
        role: UserRole.EMPLOYEE,
      });

      expect(result.name).toBe('Jane Self-Update');
      expect(result.phone).toBe('+9998887777');
    });

    it('9. EMPLOYEE cannot update another employee profile', async () => {
      const employeeDoc = { ...mockEmployee };

      mockUserModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(employeeDoc),
      });

      await expect(
        service.update(
          mockEmployeeId,
          { name: 'Hacked' },
          { _id: mockOtherEmployeeId, role: UserRole.EMPLOYEE },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('10. EMPLOYEE cannot change their email address', async () => {
      const employeeDoc = { ...mockEmployee };

      mockUserModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(employeeDoc),
      });

      await expect(
        service.update(
          mockEmployeeId,
          { email: 'newemail@example.com' },
          { _id: mockEmployeeId, role: UserRole.EMPLOYEE },
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(
          mockEmployeeId,
          { email: 'newemail@example.com' },
          { _id: mockEmployeeId, role: UserRole.EMPLOYEE },
        ),
      ).rejects.toThrow('Employees cannot change their email address');
    });
  });

  describe('updateStatus', () => {
    it('5. ADMIN can activate/deactivate employee', async () => {
      const employeeDoc = {
        ...mockEmployee,
        isActive: true,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };

      mockUserModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(employeeDoc),
      });

      const result = await service.updateStatus(mockEmployeeId, {
        isActive: false,
      });

      expect(result.isActive).toBe(false);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
