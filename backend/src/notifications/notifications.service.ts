import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationType,
  NotificationReferenceType,
} from './schemas/notification.schema.js';
import { User, UserRole } from '../users/schemas/user.schema.js';
import { QueryNotificationDto } from './dto/query-notification.dto.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  /**
   * Internal: create a notification, silently skipping duplicates (unique index).
   */
  private async createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    referenceType: NotificationReferenceType;
    referenceId: string;
  }): Promise<Notification | null> {
    try {
      const notification = new this.notificationModel({
        userId: new Types.ObjectId(params.userId),
        type: params.type,
        title: params.title,
        message: params.message,
        referenceType: params.referenceType,
        referenceId: new Types.ObjectId(params.referenceId),
        isRead: false,
      });
      return await notification.save();
    } catch (err: any) {
      // Duplicate key = already notified, skip silently
      if (err.code === 11000) return null;
      throw err;
    }
  }

  /**
   * Get all active admin user IDs for broadcast notifications.
   */
  private async getActiveAdminIds(): Promise<string[]> {
    const admins = await this.userModel
      .find({ role: UserRole.ADMIN, isActive: true })
      .select('_id')
      .exec();
    return admins.map((a) => a._id.toString());
  }

  // ── Business-event helpers ──

  async notifyOrderSubmitted(order: any): Promise<void> {
    const adminIds = await this.getActiveAdminIds();
    const employeeName =
      order.employee?.name || order.employee?._id?.toString() || 'An employee';
    const amount = order.totalAmount;

    for (const adminId of adminIds) {
      await this.createNotification({
        userId: adminId,
        type: NotificationType.ORDER_SUBMITTED,
        title: 'New Order Submitted',
        message: `${employeeName} submitted a new order worth ₹${amount}`,
        referenceType: NotificationReferenceType.ORDER,
        referenceId: order._id.toString(),
      });
    }
  }

  async notifyOrderApproved(order: any): Promise<void> {
    const employeeId =
      order.employee?._id?.toString() || order.employee?.toString();
    if (!employeeId) return;

    await this.createNotification({
      userId: employeeId,
      type: NotificationType.ORDER_APPROVED,
      title: 'Order Approved',
      message: `Your order worth ₹${order.totalAmount} has been approved`,
      referenceType: NotificationReferenceType.ORDER,
      referenceId: order._id.toString(),
    });
  }

  async notifyOrderRejected(order: any): Promise<void> {
    const employeeId =
      order.employee?._id?.toString() || order.employee?.toString();
    if (!employeeId) return;

    const reason = order.rejectionReason ? `: ${order.rejectionReason}` : '';
    await this.createNotification({
      userId: employeeId,
      type: NotificationType.ORDER_REJECTED,
      title: 'Order Rejected',
      message: `Your order worth ₹${order.totalAmount} has been rejected${reason}`,
      referenceType: NotificationReferenceType.ORDER,
      referenceId: order._id.toString(),
    });
  }

  async notifyExpenseSubmitted(expense: any): Promise<void> {
    const adminIds = await this.getActiveAdminIds();
    const employeeName =
      expense.employee?.name ||
      expense.employee?._id?.toString() ||
      'An employee';
    const amount = expense.amount;

    for (const adminId of adminIds) {
      await this.createNotification({
        userId: adminId,
        type: NotificationType.EXPENSE_SUBMITTED,
        title: 'New Expense Submitted',
        message: `${employeeName} submitted a ${expense.type} expense of ₹${amount}`,
        referenceType: NotificationReferenceType.EXPENSE,
        referenceId: expense._id.toString(),
      });
    }
  }

  async notifyExpenseApproved(expense: any): Promise<void> {
    const employeeId =
      expense.employee?._id?.toString() || expense.employee?.toString();
    if (!employeeId) return;

    await this.createNotification({
      userId: employeeId,
      type: NotificationType.EXPENSE_APPROVED,
      title: 'Expense Approved',
      message: `Your ${expense.type} expense of ₹${expense.amount} has been approved`,
      referenceType: NotificationReferenceType.EXPENSE,
      referenceId: expense._id.toString(),
    });
  }

  async notifyExpenseRejected(expense: any): Promise<void> {
    const employeeId =
      expense.employee?._id?.toString() || expense.employee?.toString();
    if (!employeeId) return;

    const reason = expense.rejectionReason
      ? `: ${expense.rejectionReason}`
      : '';
    await this.createNotification({
      userId: employeeId,
      type: NotificationType.EXPENSE_REJECTED,
      title: 'Expense Rejected',
      message: `Your ${expense.type} expense of ₹${expense.amount} has been rejected${reason}`,
      referenceType: NotificationReferenceType.EXPENSE,
      referenceId: expense._id.toString(),
    });
  }

  async notifyIncentiveGenerated(incentive: any): Promise<void> {
    const employeeId =
      incentive.employeeId?._id?.toString() || incentive.employeeId?.toString();
    if (!employeeId) return;

    await this.createNotification({
      userId: employeeId,
      type: NotificationType.INCENTIVE_GENERATED,
      title: 'Incentive Earned',
      message: `You earned an incentive of ₹${incentive.incentiveAmount}`,
      referenceType: NotificationReferenceType.INCENTIVE,
      referenceId: incentive._id.toString(),
    });
  }

  // ── API methods ──

  async findAll(query: QueryNotificationDto, requestingUser: { _id: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      userId: new Types.ObjectId(requestingUser._id),
    };

    if (query.isRead === 'true') filter.isRead = true;
    if (query.isRead === 'false') filter.isRead = false;

    const [items, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUnreadCount(requestingUser: { _id: string }): Promise<number> {
    return this.notificationModel
      .countDocuments({
        userId: new Types.ObjectId(requestingUser._id),
        isRead: false,
      })
      .exec();
  }

  async markAsRead(
    id: string,
    requestingUser: { _id: string },
  ): Promise<Notification> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Notification not found');
    }

    const notification = await this.notificationModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          userId: new Types.ObjectId(requestingUser._id),
        },
        { isRead: true },
        { new: true },
      )
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAllAsRead(requestingUser: { _id: string }): Promise<number> {
    const result = await this.notificationModel
      .updateMany(
        {
          userId: new Types.ObjectId(requestingUser._id),
          isRead: false,
        },
        { isRead: true },
      )
      .exec();

    return result.modifiedCount;
  }
}
