// User instruction: "Phase 3: Employee Management - Add backend controller tests"
// Importers/callers: Vitest test runner
// Affected API: EmployeesController unit tests
// Data schemas: UserRole, DTOs, controller authorization rules

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmployeesController } from './employees.controller.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { ForbiddenException } from '@nestjs/common';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let mockEmployeesService: any;

  const mockEmployeeId = '654321654321654321654321';
  const mockOtherEmployeeId = '123456123456123456123456';
  const mockAdminId = '999999999999999999999999';

  const mockEmployee = {
    _id: mockEmployeeId,
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1987654321',
    role: UserRole.EMPLOYEE,
    isActive: true,
  };

  beforeEach(() => {
    mockEmployeesService = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
    };

    controller = new EmployeesController(mockEmployeesService);
  });

  describe('findAll', () => {
    it('1. ADMIN can list employees', async () => {
      mockEmployeesService.findAll.mockResolvedValue({
        items: [mockEmployee],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await controller.findAll({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(mockEmployeesService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });
  });

  describe('findOne', () => {
    it('8. EMPLOYEE can access their own profile', async () => {
      mockEmployeesService.findById.mockResolvedValue(mockEmployee);

      const currentUser = { _id: mockEmployeeId, role: UserRole.EMPLOYEE };
      const result = await controller.findOne(mockEmployeeId, currentUser);

      expect(result).toEqual(mockEmployee);
      expect(mockEmployeesService.findById).toHaveBeenCalledWith(
        mockEmployeeId,
      );
    });

    it('9. EMPLOYEE cannot access another employee profile', async () => {
      const currentUser = { _id: mockOtherEmployeeId, role: UserRole.EMPLOYEE };

      await expect(
        controller.findOne(mockEmployeeId, currentUser),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.findOne(mockEmployeeId, currentUser),
      ).rejects.toThrow('You can only access your own profile');
    });

    it('3. ADMIN can access any employee profile', async () => {
      mockEmployeesService.findById.mockResolvedValue(mockEmployee);

      const currentUser = { _id: mockAdminId, role: UserRole.ADMIN };
      const result = await controller.findOne(mockEmployeeId, currentUser);

      expect(result).toEqual(mockEmployee);
      expect(mockEmployeesService.findById).toHaveBeenCalledWith(
        mockEmployeeId,
      );
    });
  });

  describe('create', () => {
    it('2. ADMIN can create employee', async () => {
      const createDto = {
        name: 'New Employee',
        email: 'new@example.com',
        phone: '+1234567890',
        password: 'password123',
      };
      mockEmployeesService.create.mockResolvedValue({
        ...createDto,
        _id: 'new-id',
        role: UserRole.EMPLOYEE,
        isActive: true,
      });

      const result = await controller.create(createDto);
      expect(result.role).toBe(UserRole.EMPLOYEE);
      expect(mockEmployeesService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('8. EMPLOYEE can update their own profile', async () => {
      const updateDto = { name: 'Jane Updated' };
      const currentUser = { _id: mockEmployeeId, role: UserRole.EMPLOYEE };

      mockEmployeesService.update.mockResolvedValue({
        ...mockEmployee,
        name: 'Jane Updated',
      });

      const result = await controller.update(
        mockEmployeeId,
        updateDto,
        currentUser,
      );
      expect(result.name).toBe('Jane Updated');
      expect(mockEmployeesService.update).toHaveBeenCalledWith(
        mockEmployeeId,
        updateDto,
        currentUser,
      );
    });

    it('9. EMPLOYEE cannot update another employee profile', async () => {
      const updateDto = { name: 'Jane Updated' };
      const currentUser = { _id: mockOtherEmployeeId, role: UserRole.EMPLOYEE };

      await expect(
        controller.update(mockEmployeeId, updateDto, currentUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('5. ADMIN can activate/deactivate employee', async () => {
      mockEmployeesService.updateStatus.mockResolvedValue({
        ...mockEmployee,
        isActive: false,
      });

      const result = await controller.updateStatus(mockEmployeeId, {
        isActive: false,
      });
      expect(result.isActive).toBe(false);
      expect(mockEmployeesService.updateStatus).toHaveBeenCalledWith(
        mockEmployeeId,
        {
          isActive: false,
        },
      );
    });
  });
});
