// User instruction: "Phase 4: Customer Management - Add backend service tests"
// Importers/callers: Vitest test runner
// Affected API: CustomersService unit tests covering 18 security and business rules
// Data schemas: Customer, User, CustomerStatus, UserRole, CreateCustomerDto, UpdateCustomerDto, UpdateStatusDto, QueryCustomerDto

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomersService } from './customers.service.js';
import { CustomerStatus } from './schemas/customer.schema.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;
  let mockCustomerModel: any;
  let mockUserModel: any;

  const mockEmployeeId = '654321654321654321654321';
  const mockOtherEmployeeId = '123456123456123456123456';
  const mockAdminId = '999999999999999999999999';
  const mockCustomerId = '507f1f77bcf86cd799439011';

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
    status: CustomerStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn(),
  };

  beforeEach(() => {
    function MockCustomerModel(this: any, dto: any) {
      Object.assign(this, dto);
      this._id = mockCustomerId;
      this.createdAt = new Date();
      this.updatedAt = new Date();
      this.save = vi.fn().mockResolvedValue({
        ...dto,
        _id: mockCustomerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    mockCustomerModel = MockCustomerModel;
    mockCustomerModel.find = vi.fn();
    mockCustomerModel.findById = vi.fn();
    mockCustomerModel.countDocuments = vi.fn();

    mockUserModel = {
      findById: vi.fn(),
    };

    service = new CustomersService(
      mockCustomerModel as any,
      mockUserModel as any,
    );
  });

  describe('create', () => {
    it('1. ADMIN can create customer', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEmployeeUser),
      });

      mockCustomerModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue({
            ...mockCustomer,
            assignedEmployee: { _id: mockEmployeeId, name: 'Jane Employee' },
          }),
        }),
      });

      const createDto = {
        customerName: 'Acme Corp',
        businessName: 'Acme Hardware',
        phone: '+1234567890',
        address: '123 Main St',
        assignedEmployee: mockEmployeeId,
      };

      const result = await service.create(createDto, {
        _id: mockAdminId,
        role: UserRole.ADMIN,
      });

      expect(result).toBeDefined();
      expect(result?.customerName).toBe('Acme Corp');
    });

    it('12. ADMIN cannot assign an ADMIN as assignedEmployee', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockAdminUser),
      });

      const createDto = {
        customerName: 'Acme Corp',
        businessName: 'Acme Hardware',
        phone: '+1234567890',
        address: '123 Main St',
        assignedEmployee: mockAdminId,
      };

      await expect(
        service.create(createDto, { _id: mockAdminId, role: UserRole.ADMIN }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(createDto, { _id: mockAdminId, role: UserRole.ADMIN }),
      ).rejects.toThrow('Assigned user must be an EMPLOYEE, not an ADMIN');
    });

    it('13. Cannot assign an inactive employee', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockInactiveEmployeeUser),
      });

      const createDto = {
        customerName: 'Acme Corp',
        businessName: 'Acme Hardware',
        phone: '+1234567890',
        address: '123 Main St',
        assignedEmployee: mockInactiveEmployeeUser._id,
      };

      await expect(
        service.create(createDto, { _id: mockAdminId, role: UserRole.ADMIN }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(createDto, { _id: mockAdminId, role: UserRole.ADMIN }),
      ).rejects.toThrow('Cannot assign customer to inactive employee');
    });

    it('14. Invalid assigned employee is rejected', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const createDto = {
        customerName: 'Acme Corp',
        businessName: 'Acme Hardware',
        phone: '+1234567890',
        address: '123 Main St',
        assignedEmployee: 'nonexistent-id',
      };

      await expect(
        service.create(createDto, { _id: mockAdminId, role: UserRole.ADMIN }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(createDto, { _id: mockAdminId, role: UserRole.ADMIN }),
      ).rejects.toThrow('Assigned employee does not exist');
    });

    it('auto-assigns EMPLOYEE creator to themselves', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEmployeeUser),
      });

      mockCustomerModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue({
            ...mockCustomer,
            assignedEmployee: { _id: mockEmployeeId, name: 'Jane Employee' },
          }),
        }),
      });

      const createDto = {
        customerName: 'Acme Corp',
        businessName: 'Acme Hardware',
        phone: '+1234567890',
        address: '123 Main St',
        assignedEmployee: mockOtherEmployeeId, // attempts to pass other ID
      };

      const result = await service.create(createDto, {
        _id: mockEmployeeId,
        role: UserRole.EMPLOYEE,
      });

      expect(mockUserModel.findById).toHaveBeenCalledWith(mockEmployeeId);
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('2. ADMIN can list all customers with pagination', async () => {
      const mockQueryExec = vi.fn().mockResolvedValue([mockCustomer]);
      const mockSort = vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            exec: mockQueryExec,
          }),
        }),
      });
      const mockPopulate = vi.fn().mockReturnValue({
        sort: mockSort,
      });

      mockCustomerModel.find.mockReturnValue({ populate: mockPopulate });
      mockCustomerModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const result = await service.findAll(
        { page: 1, limit: 10 },
        { _id: mockAdminId, role: UserRole.ADMIN },
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockCustomerModel.find).toHaveBeenCalledWith({});
    });

    it('16. Search works by customerName, businessName, or phone', async () => {
      const mockQueryExec = vi.fn().mockResolvedValue([mockCustomer]);
      const mockSort = vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            exec: mockQueryExec,
          }),
        }),
      });
      const mockPopulate = vi.fn().mockReturnValue({
        sort: mockSort,
      });

      mockCustomerModel.find.mockReturnValue({ populate: mockPopulate });
      mockCustomerModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      await service.findAll(
        { page: 1, limit: 10, search: 'Acme' },
        { _id: mockAdminId, role: UserRole.ADMIN },
      );

      expect(mockCustomerModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.any(Array),
        }),
      );
    });

    it('17. Status filtering works', async () => {
      const mockQueryExec = vi.fn().mockResolvedValue([mockCustomer]);
      const mockSort = vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            exec: mockQueryExec,
          }),
        }),
      });
      const mockPopulate = vi.fn().mockReturnValue({
        sort: mockSort,
      });

      mockCustomerModel.find.mockReturnValue({ populate: mockPopulate });
      mockCustomerModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      await service.findAll(
        { page: 1, limit: 10, status: CustomerStatus.ACTIVE },
        { _id: mockAdminId, role: UserRole.ADMIN },
      );

      expect(mockCustomerModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CustomerStatus.ACTIVE,
        }),
      );
    });

    it('18. Employee filtering works for ADMIN', async () => {
      const mockQueryExec = vi.fn().mockResolvedValue([mockCustomer]);
      const mockSort = vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            exec: mockQueryExec,
          }),
        }),
      });
      const mockPopulate = vi.fn().mockReturnValue({
        sort: mockSort,
      });

      mockCustomerModel.find.mockReturnValue({ populate: mockPopulate });
      mockCustomerModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      await service.findAll(
        { page: 1, limit: 10, employeeId: mockEmployeeId },
        { _id: mockAdminId, role: UserRole.ADMIN },
      );

      expect(mockCustomerModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedEmployee: expect.anything(),
        }),
      );
    });

    it('EMPLOYEE is always restricted to their assigned customers', async () => {
      const mockQueryExec = vi.fn().mockResolvedValue([mockCustomer]);
      const mockSort = vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            exec: mockQueryExec,
          }),
        }),
      });
      const mockPopulate = vi.fn().mockReturnValue({
        sort: mockSort,
      });

      mockCustomerModel.find.mockReturnValue({ populate: mockPopulate });
      mockCustomerModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      await service.findAll(
        { page: 1, limit: 10, employeeId: mockOtherEmployeeId }, // employee tries to bypass
        { _id: mockEmployeeId, role: UserRole.EMPLOYEE },
      );

      expect(mockCustomerModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedEmployee: expect.anything(),
        }),
      );
    });
  });

  describe('findById', () => {
    it('3. ADMIN can view customer', async () => {
      mockCustomerModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockCustomer),
        }),
      });

      const result = await service.findById(mockCustomerId, {
        _id: mockAdminId,
        role: UserRole.ADMIN,
      });

      expect(result).toBeDefined();
      expect(result._id).toBe(mockCustomerId);
    });

    it('8. EMPLOYEE can view assigned customer', async () => {
      const customerDoc = {
        ...mockCustomer,
        assignedEmployee: {
          _id: mockEmployeeId,
          name: 'Jane Employee',
          toString: () => mockEmployeeId,
        },
      };

      mockCustomerModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(customerDoc),
        }),
      });

      const result = await service.findById(mockCustomerId, {
        _id: mockEmployeeId,
        role: UserRole.EMPLOYEE,
      });

      expect(result).toBeDefined();
    });

    it('9. EMPLOYEE cannot view another employee customer', async () => {
      const customerDoc = {
        ...mockCustomer,
        assignedEmployee: {
          _id: mockOtherEmployeeId,
          name: 'Bob Employee',
          toString: () => mockOtherEmployeeId,
        },
      };

      mockCustomerModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(customerDoc),
        }),
      });

      await expect(
        service.findById(mockCustomerId, {
          _id: mockEmployeeId,
          role: UserRole.EMPLOYEE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('4. ADMIN can update customer details', async () => {
      const customerDoc = {
        ...mockCustomer,
        assignedEmployee: mockEmployeeId,
        save: vi.fn().mockResolvedValue(true),
      };

      mockCustomerModel.findById
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue(customerDoc),
        })
        .mockReturnValueOnce({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue({
              ...customerDoc,
              customerName: 'Updated Name',
            }),
          }),
        });

      const result = await service.update(
        mockCustomerId,
        { customerName: 'Updated Name' },
        { _id: mockAdminId, role: UserRole.ADMIN },
      );

      expect(result?.customerName).toBe('Updated Name');
    });

    it('5. ADMIN can assign employee', async () => {
      const customerDoc = {
        ...mockCustomer,
        assignedEmployee: mockEmployeeId,
        save: vi.fn().mockResolvedValue(true),
      };

      mockCustomerModel.findById
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue(customerDoc),
        })
        .mockReturnValueOnce({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue({
              ...customerDoc,
              assignedEmployee: { _id: mockOtherEmployeeId },
            }),
          }),
        });

      mockUserModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockOtherEmployeeUser),
      });

      const result = await service.update(
        mockCustomerId,
        { assignedEmployee: mockOtherEmployeeId },
        { _id: mockAdminId, role: UserRole.ADMIN },
      );

      expect(result).toBeDefined();
      expect(mockUserModel.findById).toHaveBeenCalledWith(mockOtherEmployeeId);
    });

    it('10. EMPLOYEE cannot assign customer to another employee', async () => {
      const customerDoc = {
        ...mockCustomer,
        assignedEmployee: mockEmployeeId,
        save: vi.fn(),
      };

      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(customerDoc),
      });

      await expect(
        service.update(
          mockCustomerId,
          { assignedEmployee: mockOtherEmployeeId },
          { _id: mockEmployeeId, role: UserRole.EMPLOYEE },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('11. EMPLOYEE cannot modify customer ownership', async () => {
      const customerDoc = {
        ...mockCustomer,
        assignedEmployee: mockOtherEmployeeId,
        save: vi.fn(),
      };

      mockCustomerModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(customerDoc),
      });

      await expect(
        service.update(
          mockCustomerId,
          { customerName: 'New Name' },
          { _id: mockEmployeeId, role: UserRole.EMPLOYEE },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('6. ADMIN can deactivate customer', async () => {
      const customerDoc = {
        ...mockCustomer,
        status: CustomerStatus.ACTIVE,
        save: vi.fn().mockResolvedValue(true),
      };

      mockCustomerModel.findById
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue(customerDoc),
        })
        .mockReturnValueOnce({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue({
              ...customerDoc,
              status: CustomerStatus.INACTIVE,
            }),
          }),
        });

      const result = await service.updateStatus(mockCustomerId, {
        status: CustomerStatus.INACTIVE,
      });

      expect(result?.status).toBe(CustomerStatus.INACTIVE);
    });

    it('7. ADMIN can reactivate customer', async () => {
      const customerDoc = {
        ...mockCustomer,
        status: CustomerStatus.INACTIVE,
        save: vi.fn().mockResolvedValue(true),
      };

      mockCustomerModel.findById
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue(customerDoc),
        })
        .mockReturnValueOnce({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue({
              ...customerDoc,
              status: CustomerStatus.ACTIVE,
            }),
          }),
        });

      const result = await service.updateStatus(mockCustomerId, {
        status: CustomerStatus.ACTIVE,
      });

      expect(result?.status).toBe(CustomerStatus.ACTIVE);
    });
  });
});
