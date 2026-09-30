// User instruction: "Phase 6: Order Management - Create OrdersController unit tests"
// Importers/callers: Vitest test runner
// Affected API: OrdersController endpoint mappings, delegation to OrdersService
// Data schemas: Order, CreateOrderDto, UpdateOrderDto, QueryOrderDto, RejectOrderDto

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockUser = {
    _id: '654321654321654321654321',
    role: 'EMPLOYEE',
  };

  const mockAdmin = {
    _id: '999999999999999999999999',
    role: 'ADMIN',
  };

  beforeEach(() => {
    service = {
      findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      findById: vi.fn().mockResolvedValue({ _id: '123' }),
      create: vi.fn().mockResolvedValue({ _id: '123' }),
      update: vi.fn().mockResolvedValue({ _id: '123' }),
      approve: vi.fn().mockResolvedValue({ _id: '123', status: 'APPROVED' }),
      reject: vi.fn().mockResolvedValue({ _id: '123', status: 'REJECTED' }),
      complete: vi.fn().mockResolvedValue({ _id: '123', status: 'COMPLETED' }),
      cancel: vi.fn().mockResolvedValue({ _id: '123', status: 'CANCELLED' }),
    } as any;

    controller = new OrdersController(service);
  });

  it('should call findAll on service', async () => {
    const query = { page: 1, limit: 10 };
    await controller.findAll(query, mockUser);
    expect(service.findAll).toHaveBeenCalledWith(query, mockUser);
  });

  it('should call findById on service', async () => {
    await controller.findOne('507f1f77bcf86cd799439011', mockUser);
    expect(service.findById).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      mockUser,
    );
  });

  it('should call create on service', async () => {
    const dto = {
      customer: '507f1f77bcf86cd799439011',
      items: [{ productName: 'P1', quantity: 1, unitPrice: 10 }],
    };
    await controller.create(dto as any, mockUser);
    expect(service.create).toHaveBeenCalledWith(dto, mockUser);
  });

  it('should call update on service', async () => {
    const dto = { notes: 'Updated notes' };
    await controller.update('507f1f77bcf86cd799439011', dto, mockUser);
    expect(service.update).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      dto,
      mockUser,
    );
  });

  it('should call approve on service with admin user', async () => {
    await controller.approve('507f1f77bcf86cd799439011', mockAdmin);
    expect(service.approve).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      mockAdmin,
    );
  });

  it('should call reject on service with admin user and reason', async () => {
    const dto = { reason: 'Price too low' };
    await controller.reject('507f1f77bcf86cd799439011', dto, mockAdmin);
    expect(service.reject).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      dto,
      mockAdmin,
    );
  });

  it('should call complete on service with admin user', async () => {
    await controller.complete('507f1f77bcf86cd799439011', mockAdmin);
    expect(service.complete).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      mockAdmin,
    );
  });

  it('should call cancel on service', async () => {
    await controller.cancel('507f1f77bcf86cd799439011', mockUser);
    expect(service.cancel).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      mockUser,
    );
  });
});
