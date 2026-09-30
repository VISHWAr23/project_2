// User instruction: "Phase 5: Customer Visit Management - Create VisitsController tests"
// Importers/callers: Vitest test runner
// Affected API: VisitsController unit tests
// Data schemas: Visit, User, CreateVisitDto, UpdateVisitDto, QueryVisitDto

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VisitsController } from './visits.controller.js';
import { VisitsService } from './visits.service.js';
import { UserRole } from '../users/schemas/user.schema.js';

describe('VisitsController', () => {
  let controller: VisitsController;
  let service: VisitsService;

  const mockAdminUser = {
    _id: '999999999999999999999999',
    role: UserRole.ADMIN,
  };

  const mockVisit = {
    _id: '507f1f77bcf86cd799439099',
    customer: '507f1f77bcf86cd799439011',
    employee: '654321654321654321654321',
    visitDate: new Date('2026-03-01T10:00:00.000Z'),
    purpose: 'Routine checkup',
    result: 'Order promised',
  };

  beforeEach(() => {
    service = {
      findAll: vi.fn().mockResolvedValue({ items: [mockVisit], total: 1 }),
      findById: vi.fn().mockResolvedValue(mockVisit),
      create: vi.fn().mockResolvedValue(mockVisit),
      update: vi.fn().mockResolvedValue(mockVisit),
      findByCustomer: vi.fn().mockResolvedValue([mockVisit]),
    } as any;

    controller = new VisitsController(service);
  });

  it('should call service.findAll with query and user', async () => {
    const query = { page: 1, limit: 10 };
    const result = await controller.findAll(query, mockAdminUser);
    expect(service.findAll).toHaveBeenCalledWith(query, mockAdminUser);
    expect(result).toEqual({ items: [mockVisit], total: 1 });
  });

  it('should call service.findById with id and user', async () => {
    const result = await controller.findOne(mockVisit._id, mockAdminUser);
    expect(service.findById).toHaveBeenCalledWith(mockVisit._id, mockAdminUser);
    expect(result).toEqual(mockVisit);
  });

  it('should call service.create with dto and user', async () => {
    const dto = {
      customer: mockVisit.customer,
      visitDate: mockVisit.visitDate,
      purpose: mockVisit.purpose,
      result: mockVisit.result,
    };
    const result = await controller.create(dto, mockAdminUser);
    expect(service.create).toHaveBeenCalledWith(dto, mockAdminUser);
    expect(result).toEqual(mockVisit);
  });

  it('should call service.update with id, dto and user', async () => {
    const dto = { purpose: 'Updated purpose' };
    const result = await controller.update(mockVisit._id, dto, mockAdminUser);
    expect(service.update).toHaveBeenCalledWith(
      mockVisit._id,
      dto,
      mockAdminUser,
    );
    expect(result).toEqual(mockVisit);
  });
});
