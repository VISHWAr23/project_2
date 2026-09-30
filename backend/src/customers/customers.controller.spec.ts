// User instruction: "Phase 4: Customer Management - Add backend controller tests"
// Importers/callers: Vitest test runner
// Affected API: CustomersController unit tests
// Data schemas: UserRole, DTOs, controller authorization rules

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomersController } from './customers.controller.js';
import { CustomerStatus } from './schemas/customer.schema.js';
import { UserRole } from '../users/schemas/user.schema.js';

describe('CustomersController', () => {
  let controller: CustomersController;
  let mockCustomersService: any;
  let mockVisitsService: any;

  const mockEmployeeId = '654321654321654321654321';
  const mockAdminId = '999999999999999999999999';
  const mockCustomerId = '507f1f77bcf86cd799439011';

  const mockCustomer = {
    _id: mockCustomerId,
    customerName: 'Acme Corp',
    businessName: 'Acme Hardware',
    phone: '+1234567890',
    address: '123 Main St',
    assignedEmployee: mockEmployeeId,
    status: CustomerStatus.ACTIVE,
  };

  beforeEach(() => {
    mockCustomersService = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
    };
    mockVisitsService = {
      findByCustomer: vi.fn(),
    };

    controller = new CustomersController(mockCustomersService, mockVisitsService);
  });

  describe('findAll', () => {
    it('delegates findAll with query and user', async () => {
      mockCustomersService.findAll.mockResolvedValue({
        items: [mockCustomer],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const user = { _id: mockAdminId, role: UserRole.ADMIN };
      const query = { page: 1, limit: 10 };
      const result = await controller.findAll(query, user);

      expect(result.items).toHaveLength(1);
      expect(mockCustomersService.findAll).toHaveBeenCalledWith(query, user);
    });
  });

  describe('findOne', () => {
    it('delegates findById with id and user', async () => {
      mockCustomersService.findById.mockResolvedValue(mockCustomer);

      const user = { _id: mockEmployeeId, role: UserRole.EMPLOYEE };
      const result = await controller.findOne(mockCustomerId, user);

      expect(result).toEqual(mockCustomer);
      expect(mockCustomersService.findById).toHaveBeenCalledWith(
        mockCustomerId,
        user,
      );
    });
  });

  describe('create', () => {
    it('delegates create with DTO and user', async () => {
      const createDto = {
        customerName: 'Acme Corp',
        businessName: 'Acme Hardware',
        phone: '+1234567890',
        address: '123 Main St',
        assignedEmployee: mockEmployeeId,
      };

      mockCustomersService.create.mockResolvedValue({
        ...createDto,
        _id: mockCustomerId,
        status: CustomerStatus.ACTIVE,
      });

      const user = { _id: mockAdminId, role: UserRole.ADMIN };
      const result = await controller.create(createDto, user);

      expect(result?.customerName).toBe('Acme Corp');
      expect(mockCustomersService.create).toHaveBeenCalledWith(createDto, user);
    });
  });

  describe('update', () => {
    it('delegates update with id, DTO, and user', async () => {
      const updateDto = { customerName: 'Acme Updated' };
      mockCustomersService.update.mockResolvedValue({
        ...mockCustomer,
        customerName: 'Acme Updated',
      });

      const user = { _id: mockEmployeeId, role: UserRole.EMPLOYEE };
      const result = await controller.update(mockCustomerId, updateDto, user);

      expect(result?.customerName).toBe('Acme Updated');
      expect(mockCustomersService.update).toHaveBeenCalledWith(
        mockCustomerId,
        updateDto,
        user,
      );
    });
  });

  describe('updateStatus', () => {
    it('delegates updateStatus with id and status DTO', async () => {
      const statusDto = { status: CustomerStatus.INACTIVE };
      mockCustomersService.updateStatus.mockResolvedValue({
        ...mockCustomer,
        status: CustomerStatus.INACTIVE,
      });

      const result = await controller.updateStatus(mockCustomerId, statusDto);

      expect(result?.status).toBe(CustomerStatus.INACTIVE);
      expect(mockCustomersService.updateStatus).toHaveBeenCalledWith(
        mockCustomerId,
        statusDto,
      );
    });
  });
});
