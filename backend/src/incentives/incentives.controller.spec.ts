// User instruction: "Phase 7: Employee Incentive Management - Add unit tests for IncentivesController"
// Importers/callers: Vitest test runner
// Affected API: IncentivesController routes and service delegation
// Data schemas: Incentive, IncentiveRule, UpdateIncentiveRuleDto, QueryIncentiveDto, UserRole

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncentivesController } from './incentives.controller.js';
import { IncentivesService } from './incentives.service.js';
import { UserRole } from '../users/schemas/user.schema.js';

describe('IncentivesController', () => {
  let controller: IncentivesController;
  let mockService: any;

  const mockAdminUser = {
    _id: '999999999999999999999999',
    role: UserRole.ADMIN,
  };

  const mockEmployeeUser = {
    _id: '654321654321654321654321',
    role: UserRole.EMPLOYEE,
  };

  beforeEach(() => {
    mockService = {
      getActiveRule: vi
        .fn()
        .mockResolvedValue({ percentage: 2, isActive: true }),
      updateActiveRule: vi
        .fn()
        .mockResolvedValue({ percentage: 3, isActive: true }),
      findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      findById: vi.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439077' }),
      findByOrderId: vi
        .fn()
        .mockResolvedValue({ _id: '507f1f77bcf86cd799439077' }),
      markAsPaid: vi.fn().mockResolvedValue({ status: 'PAID' }),
    };

    controller = new IncentivesController(
      mockService as unknown as IncentivesService,
    );
  });

  it('should delegate getActiveRule to service', async () => {
    const result = await controller.getActiveRule();
    expect(result).toEqual({ percentage: 2, isActive: true });
    expect(mockService.getActiveRule).toHaveBeenCalled();
  });

  it('should delegate updateActiveRule to service', async () => {
    const dto = { percentage: 3 };
    const result = await controller.updateActiveRule(dto, mockAdminUser);
    expect(result).toEqual({ percentage: 3, isActive: true });
    expect(mockService.updateActiveRule).toHaveBeenCalledWith(
      dto,
      mockAdminUser,
    );
  });

  it('should delegate findAll to service', async () => {
    const query = { page: 1, limit: 10 };
    await controller.findAll(query, mockEmployeeUser);
    expect(mockService.findAll).toHaveBeenCalledWith(query, mockEmployeeUser);
  });

  it('should delegate findById to service', async () => {
    const id = '507f1f77bcf86cd799439077';
    await controller.findById(id, mockEmployeeUser);
    expect(mockService.findById).toHaveBeenCalledWith(id, mockEmployeeUser);
  });

  it('should delegate findByOrderId to service', async () => {
    const orderId = '507f1f77bcf86cd799439099';
    await controller.findByOrderId(orderId, mockEmployeeUser);
    expect(mockService.findByOrderId).toHaveBeenCalledWith(
      orderId,
      mockEmployeeUser,
    );
  });

  it('should delegate markAsPaid to service', async () => {
    const id = '507f1f77bcf86cd799439077';
    await controller.markAsPaid(id, mockAdminUser);
    expect(mockService.markAsPaid).toHaveBeenCalledWith(id, mockAdminUser);
  });
});
