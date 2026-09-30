// User instruction: "Phase 11: Notifications - Add comprehensive backend unit tests for NotificationsService covering all 22 test requirements"
// Importers/callers: Vitest test runner
// Affected API: NotificationsService business logic (notifyOrderSubmitted, notifyOrderApproved, notifyOrderRejected, notifyExpenseSubmitted, notifyExpenseApproved, notifyExpenseRejected, notifyIncentiveGenerated, findAll, getUnreadCount, markAsRead, markAllAsRead)
// Data schemas: Notification, NotificationType, NotificationReferenceType, User, UserRole, QueryNotificationDto

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationsService } from './notifications.service.js';
import {
  NotificationType,
  NotificationReferenceType,
} from './schemas/notification.schema.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockNotificationModel: any;
  let mockUserModel: any;

  const mockEmployeeId = '654321654321654321654321';
  const mockAdmin1Id = '999999999999999999999991';
  const mockAdmin2Id = '999999999999999999999992';
  const mockNotificationId = '507f1f77bcf86cd799439011';
  const mockOrderId = '507f1f77bcf86cd799439022';
  const mockExpenseId = '507f1f77bcf86cd799439033';
  const mockIncentiveId = '507f1f77bcf86cd799439044';

  const mockAdminList = [
    {
      _id: new Types.ObjectId(mockAdmin1Id),
      role: UserRole.ADMIN,
      isActive: true,
    },
    {
      _id: new Types.ObjectId(mockAdmin2Id),
      role: UserRole.ADMIN,
      isActive: true,
    },
  ];

  const mockNotificationDoc = {
    _id: new Types.ObjectId(mockNotificationId),
    userId: new Types.ObjectId(mockEmployeeId),
    type: NotificationType.ORDER_APPROVED,
    title: 'Order Approved',
    message: 'Your order worth ₹5000 has been approved',
    referenceType: NotificationReferenceType.ORDER,
    referenceId: new Types.ObjectId(mockOrderId),
    isRead: false,
    createdAt: new Date('2026-03-25T10:00:00Z'),
    updatedAt: new Date('2026-03-25T10:00:00Z'),
  };

  beforeEach(() => {
    const mockFindQuery = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([mockNotificationDoc]),
    };

    const mockAdminSelectQuery = {
      select: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(mockAdminList),
    };

    mockNotificationModel = vi.fn().mockImplementation(function (dto: any) {
      return {
        ...dto,
        _id: new Types.ObjectId(mockNotificationId),
        save: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockNotificationId),
          ...dto,
        }),
      };
    });

    mockNotificationModel.find = vi.fn().mockReturnValue(mockFindQuery);
    mockNotificationModel.countDocuments = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(1),
    });
    mockNotificationModel.findOneAndUpdate = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        ...mockNotificationDoc,
        isRead: true,
      }),
    });
    mockNotificationModel.updateMany = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue({ modifiedCount: 3 }),
    });

    mockUserModel = {
      find: vi.fn().mockReturnValue(mockAdminSelectQuery),
    };

    service = new NotificationsService(
      mockNotificationModel as any,
      mockUserModel as any,
    );
  });

  describe('Event Trigger: Order Notifications', () => {
    it('1. notifyOrderSubmitted: should broadcast notification to all active admins', async () => {
      const order = {
        _id: new Types.ObjectId(mockOrderId),
        employee: { _id: new Types.ObjectId(mockEmployeeId), name: 'John Doe' },
        totalAmount: 15000,
      };

      await service.notifyOrderSubmitted(order);

      expect(mockUserModel.find).toHaveBeenCalledWith({
        role: UserRole.ADMIN,
        isActive: true,
      });
      expect(mockNotificationModel).toHaveBeenCalledTimes(2);
    });

    it('2. notifyOrderSubmitted: should use employee name when populated', async () => {
      const order = {
        _id: new Types.ObjectId(mockOrderId),
        employee: {
          _id: new Types.ObjectId(mockEmployeeId),
          name: 'Jane Smith',
        },
        totalAmount: 2500,
      };

      await service.notifyOrderSubmitted(order);

      const firstCallArg = mockNotificationModel.mock.calls[0][0];
      expect(firstCallArg.message).toContain(
        'Jane Smith submitted a new order worth ₹2500',
      );
      expect(firstCallArg.type).toBe(NotificationType.ORDER_SUBMITTED);
      expect(firstCallArg.referenceType).toBe(NotificationReferenceType.ORDER);
    });

    it('3. notifyOrderSubmitted: should fallback to employee id or default when name missing', async () => {
      const order = {
        _id: new Types.ObjectId(mockOrderId),
        employee: new Types.ObjectId(mockEmployeeId),
        totalAmount: 3000,
      };

      await service.notifyOrderSubmitted(order);

      const firstCallArg = mockNotificationModel.mock.calls[0][0];
      expect(firstCallArg.message).toContain(
        'submitted a new order worth ₹3000',
      );
    });

    it('4. notifyOrderApproved: should create notification for employee with order amount', async () => {
      const order = {
        _id: new Types.ObjectId(mockOrderId),
        employee: { _id: new Types.ObjectId(mockEmployeeId) },
        totalAmount: 8500,
      };

      await service.notifyOrderApproved(order);

      expect(mockNotificationModel).toHaveBeenCalledTimes(1);
      const callArg = mockNotificationModel.mock.calls[0][0];
      expect(callArg.userId.toString()).toBe(mockEmployeeId);
      expect(callArg.type).toBe(NotificationType.ORDER_APPROVED);
      expect(callArg.message).toBe('Your order worth ₹8500 has been approved');
      expect(callArg.referenceType).toBe(NotificationReferenceType.ORDER);
    });

    it('5. notifyOrderApproved: should gracefully return if employee is missing', async () => {
      const order = {
        _id: new Types.ObjectId(mockOrderId),
        totalAmount: 5000,
      };

      await service.notifyOrderApproved(order);

      expect(mockNotificationModel).not.toHaveBeenCalled();
    });

    it('6. notifyOrderRejected: should create notification with rejection reason', async () => {
      const order = {
        _id: new Types.ObjectId(mockOrderId),
        employee: { _id: new Types.ObjectId(mockEmployeeId) },
        totalAmount: 4200,
        rejectionReason: 'Invalid pricing applied',
      };

      await service.notifyOrderRejected(order);

      expect(mockNotificationModel).toHaveBeenCalledTimes(1);
      const callArg = mockNotificationModel.mock.calls[0][0];
      expect(callArg.userId.toString()).toBe(mockEmployeeId);
      expect(callArg.type).toBe(NotificationType.ORDER_REJECTED);
      expect(callArg.message).toBe(
        'Your order worth ₹4200 has been rejected: Invalid pricing applied',
      );
    });

    it('7. notifyOrderRejected: should create notification without reason suffix if omitted', async () => {
      const order = {
        _id: new Types.ObjectId(mockOrderId),
        employee: { _id: new Types.ObjectId(mockEmployeeId) },
        totalAmount: 4200,
      };

      await service.notifyOrderRejected(order);

      const callArg = mockNotificationModel.mock.calls[0][0];
      expect(callArg.message).toBe('Your order worth ₹4200 has been rejected');
    });

    it('8. notifyOrderRejected: should gracefully return if employee is missing', async () => {
      const order = {
        _id: new Types.ObjectId(mockOrderId),
        totalAmount: 4200,
      };

      await service.notifyOrderRejected(order);

      expect(mockNotificationModel).not.toHaveBeenCalled();
    });
  });

  describe('Event Trigger: Expense Notifications', () => {
    it('9. notifyExpenseSubmitted: should broadcast notification to all active admins with type and amount', async () => {
      const expense = {
        _id: new Types.ObjectId(mockExpenseId),
        employee: {
          _id: new Types.ObjectId(mockEmployeeId),
          name: 'Bob Johnson',
        },
        type: 'TRAVEL',
        amount: 1500,
      };

      await service.notifyExpenseSubmitted(expense);

      expect(mockNotificationModel).toHaveBeenCalledTimes(2);
      const firstCallArg = mockNotificationModel.mock.calls[0][0];
      expect(firstCallArg.type).toBe(NotificationType.EXPENSE_SUBMITTED);
      expect(firstCallArg.message).toContain(
        'Bob Johnson submitted a TRAVEL expense of ₹1500',
      );
      expect(firstCallArg.referenceType).toBe(
        NotificationReferenceType.EXPENSE,
      );
    });

    it('10. notifyExpenseApproved: should create notification for employee with type and amount', async () => {
      const expense = {
        _id: new Types.ObjectId(mockExpenseId),
        employee: { _id: new Types.ObjectId(mockEmployeeId) },
        type: 'FOOD',
        amount: 800,
      };

      await service.notifyExpenseApproved(expense);

      expect(mockNotificationModel).toHaveBeenCalledTimes(1);
      const callArg = mockNotificationModel.mock.calls[0][0];
      expect(callArg.userId.toString()).toBe(mockEmployeeId);
      expect(callArg.type).toBe(NotificationType.EXPENSE_APPROVED);
      expect(callArg.message).toBe(
        'Your FOOD expense of ₹800 has been approved',
      );
      expect(callArg.referenceType).toBe(NotificationReferenceType.EXPENSE);
    });

    it('11. notifyExpenseApproved: should gracefully return if employee is missing', async () => {
      const expense = {
        _id: new Types.ObjectId(mockExpenseId),
        type: 'FOOD',
        amount: 800,
      };

      await service.notifyExpenseApproved(expense);

      expect(mockNotificationModel).not.toHaveBeenCalled();
    });

    it('12. notifyExpenseRejected: should create notification with rejection reason', async () => {
      const expense = {
        _id: new Types.ObjectId(mockExpenseId),
        employee: { _id: new Types.ObjectId(mockEmployeeId) },
        type: 'LODGING',
        amount: 3500,
        rejectionReason: 'Missing hotel bill receipt',
      };

      await service.notifyExpenseRejected(expense);

      expect(mockNotificationModel).toHaveBeenCalledTimes(1);
      const callArg = mockNotificationModel.mock.calls[0][0];
      expect(callArg.userId.toString()).toBe(mockEmployeeId);
      expect(callArg.type).toBe(NotificationType.EXPENSE_REJECTED);
      expect(callArg.message).toBe(
        'Your LODGING expense of ₹3500 has been rejected: Missing hotel bill receipt',
      );
    });

    it('13. notifyExpenseRejected: should create notification without reason suffix when absent', async () => {
      const expense = {
        _id: new Types.ObjectId(mockExpenseId),
        employee: { _id: new Types.ObjectId(mockEmployeeId) },
        type: 'OTHER',
        amount: 600,
      };

      await service.notifyExpenseRejected(expense);

      const callArg = mockNotificationModel.mock.calls[0][0];
      expect(callArg.message).toBe(
        'Your OTHER expense of ₹600 has been rejected',
      );
    });
  });

  describe('Event Trigger: Incentive Notifications', () => {
    it('14. notifyIncentiveGenerated: should create notification for employee with incentive amount', async () => {
      const incentive = {
        _id: new Types.ObjectId(mockIncentiveId),
        employeeId: { _id: new Types.ObjectId(mockEmployeeId) },
        incentiveAmount: 450,
      };

      await service.notifyIncentiveGenerated(incentive);

      expect(mockNotificationModel).toHaveBeenCalledTimes(1);
      const callArg = mockNotificationModel.mock.calls[0][0];
      expect(callArg.userId.toString()).toBe(mockEmployeeId);
      expect(callArg.type).toBe(NotificationType.INCENTIVE_GENERATED);
      expect(callArg.message).toBe('You earned an incentive of ₹450');
      expect(callArg.referenceType).toBe(NotificationReferenceType.INCENTIVE);
    });

    it('15. notifyIncentiveGenerated: should gracefully return if employee reference is missing', async () => {
      const incentive = {
        _id: new Types.ObjectId(mockIncentiveId),
        incentiveAmount: 450,
      };

      await service.notifyIncentiveGenerated(incentive);

      expect(mockNotificationModel).not.toHaveBeenCalled();
    });
  });

  describe('Idempotency & Concurrency Safety', () => {
    it('16. createNotification: should silently suppress Mongo duplicate key error (11000)', async () => {
      mockNotificationModel.mockImplementationOnce(function () {
        return {
          save: vi
            .fn()
            .mockRejectedValue({
              code: 11000,
              message: 'E11000 duplicate key error',
            }),
        };
      });

      const order = {
        _id: new Types.ObjectId(mockOrderId),
        employee: { _id: new Types.ObjectId(mockEmployeeId) },
        totalAmount: 1000,
      };

      await expect(service.notifyOrderApproved(order)).resolves.not.toThrow();
    });

    it('17. createNotification: should rethrow non-duplicate database errors', async () => {
      mockNotificationModel.mockImplementationOnce(function () {
        return {
          save: vi
            .fn()
            .mockRejectedValue(new Error('Database connection failed')),
        };
      });

      const order = {
        _id: new Types.ObjectId(mockOrderId),
        employee: { _id: new Types.ObjectId(mockEmployeeId) },
        totalAmount: 1000,
      };

      await expect(service.notifyOrderApproved(order)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('Query APIs: findAll & getUnreadCount', () => {
    it('18. findAll: should return paginated list of notifications for requesting user', async () => {
      const result = await service.findAll({ page: '1', limit: '10' } as any, {
        _id: mockEmployeeId,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(mockNotificationModel.find).toHaveBeenCalledWith({
        userId: new Types.ObjectId(mockEmployeeId),
      });
    });

    it('19. findAll: should apply isRead boolean filter when requested', async () => {
      await service.findAll(
        { page: '1', limit: '10', isRead: 'false' } as any,
        { _id: mockEmployeeId },
      );

      expect(mockNotificationModel.find).toHaveBeenCalledWith({
        userId: new Types.ObjectId(mockEmployeeId),
        isRead: false,
      });

      await service.findAll({ page: '1', limit: '10', isRead: 'true' } as any, {
        _id: mockEmployeeId,
      });

      expect(mockNotificationModel.find).toHaveBeenCalledWith({
        userId: new Types.ObjectId(mockEmployeeId),
        isRead: true,
      });
    });

    it('20. getUnreadCount: should count unread notifications for requesting user', async () => {
      mockNotificationModel.countDocuments.mockReturnValueOnce({
        exec: vi.fn().mockResolvedValue(5),
      });

      const count = await service.getUnreadCount({ _id: mockEmployeeId });

      expect(count).toBe(5);
      expect(mockNotificationModel.countDocuments).toHaveBeenCalledWith({
        userId: new Types.ObjectId(mockEmployeeId),
        isRead: false,
      });
    });
  });

  describe('Mutation APIs: markAsRead & markAllAsRead', () => {
    it('21. markAsRead: should mark single notification as read and throw NotFoundException for invalid ID', async () => {
      const updated = await service.markAsRead(mockNotificationId, {
        _id: mockEmployeeId,
      });

      expect(updated.isRead).toBe(true);
      expect(mockNotificationModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(mockNotificationId),
          userId: new Types.ObjectId(mockEmployeeId),
        },
        { isRead: true },
        { new: true },
      );

      await expect(
        service.markAsRead('invalid-id', { _id: mockEmployeeId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('22. markAllAsRead: should update all unread notifications for user and return modified count', async () => {
      const count = await service.markAllAsRead({ _id: mockEmployeeId });

      expect(count).toBe(3);
      expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
        {
          userId: new Types.ObjectId(mockEmployeeId),
          isRead: false,
        },
        { isRead: true },
      );
    });
  });
});
