// User instruction: "Phase 7: Employee Incentive Management - Create IncentivesService"
// Importers/callers: backend/src/incentives/incentives.controller.ts, backend/src/orders/orders.service.ts, backend/src/incentives/incentives.module.ts
// Affected API: /api/incentives (findAll, findById, findByOrderId, markAsPaid, getActiveRule, updateActiveRule, generateIncentiveForOrder)
// Data schemas: Incentive, IncentiveRule, IncentiveStatus, User, Order, UpdateIncentiveRuleDto, QueryIncentiveDto

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Incentive,
  IncentiveDocument,
  IncentiveStatus,
} from './schemas/incentive.schema.js';
import {
  IncentiveRule,
  IncentiveRuleDocument,
} from './schemas/incentive-rule.schema.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { UpdateIncentiveRuleDto } from './dto/update-incentive-rule.dto.js';
import { QueryIncentiveDto } from './dto/query-incentive.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class IncentivesService {
  constructor(
    @InjectModel(Incentive.name)
    private incentiveModel: Model<IncentiveDocument>,
    @InjectModel(IncentiveRule.name)
    private incentiveRuleModel: Model<IncentiveRuleDocument>,
    private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Deterministic money calculation strategy:
   * incentiveAmount = orderAmount * percentage / 100 rounded to 2 decimal places.
   */
  public calculateIncentiveAmount(
    orderAmount: number,
    percentage: number,
  ): number {
    const amount = Number(orderAmount);
    const pct = Number(percentage);

    if (isNaN(amount) || amount < 0) {
      throw new BadRequestException(
        'Order amount must be a non-negative number',
      );
    }
    if (isNaN(pct) || pct < 0 || pct > 100) {
      throw new BadRequestException(
        'Incentive percentage must be between 0 and 100',
      );
    }

    return Math.round(((amount * pct) / 100) * 100) / 100;
  }

  /**
   * Retrieves the currently active incentive rule.
   * If no rule exists in the database, a default 2% active rule is created and returned.
   */
  async getActiveRule(): Promise<IncentiveRule> {
    let rule = await this.incentiveRuleModel.findOne({ isActive: true }).exec();
    if (!rule) {
      rule = new this.incentiveRuleModel({
        percentage: 2,
        isActive: true,
      });
      await rule.save();
    }
    return rule;
  }

  /**
   * Updates the active incentive rule percentage.
   * Enforces that historical incentives are untouched.
   */
  async updateActiveRule(
    dto: UpdateIncentiveRuleDto,
    requestingUser: { _id: string; role: UserRole },
  ): Promise<IncentiveRule> {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only ADMIN can update incentive rules');
    }

    const percentage = Number(dto.percentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      throw new BadRequestException(
        'Incentive percentage must be between 0 and 100',
      );
    }

    let rule = await this.incentiveRuleModel.findOne({ isActive: true }).exec();
    if (rule) {
      rule.percentage = percentage;
      await rule.save();
      return rule;
    }

    rule = new this.incentiveRuleModel({
      percentage,
      isActive: true,
    });
    return rule.save();
  }

  /**
   * Automatically generates an incentive record when an order transitions to APPROVED.
   * Idempotent & safe against duplicate generation via database unique index on orderId.
   */
  async generateIncentiveForOrder(order: any): Promise<Incentive | null> {
    if (!order) {
      throw new BadRequestException(
        'Order is required for incentive generation',
      );
    }

    // Only APPROVED orders can generate incentives
    if (order.status !== 'APPROVED') {
      return null;
    }

    const orderId = order._id;
    const employeeId =
      order.employee && order.employee._id
        ? order.employee._id
        : order.employee;

    if (!orderId || !employeeId) {
      throw new BadRequestException(
        'Order must have valid order ID and employee reference',
      );
    }

    // 1. Check if incentive already exists for this order
    const existing = await this.incentiveModel.findOne({ orderId }).exec();
    if (existing) {
      return existing;
    }

    // 2. Fetch active rule percentage at the time of approval
    const activeRule = await this.getActiveRule();
    const percentage = activeRule.percentage;

    // 3. Compute deterministic incentive amount
    const incentiveAmount = this.calculateIncentiveAmount(
      order.totalAmount,
      percentage,
    );

    // 4. Create incentive document
    try {
      const incentive = new this.incentiveModel({
        orderId: new Types.ObjectId(orderId),
        employeeId: new Types.ObjectId(employeeId),
        orderAmount: order.totalAmount,
        percentage,
        incentiveAmount,
        status: IncentiveStatus.UNPAID,
      });

      const saved = await incentive.save();
      if (this.notificationsService) {
        this.notificationsService
          .notifyIncentiveGenerated(saved)
          .catch(() => {});
      }
      return saved;
    } catch (err: any) {
      // Catch MongoDB duplicate key error (E11000) for concurrency safety
      if (err.code === 11000 || err.name === 'MongoServerError') {
        const found = await this.incentiveModel.findOne({ orderId }).exec();
        if (found) return found;
      }
      throw err;
    }
  }

  /**
   * Lists incentives with role-based filtering, date range, status, and summary metrics.
   */
  async findAll(
    query: QueryIncentiveDto,
    requestingUser: { _id: string; role: string },
  ) {
    const filter: Record<string, any> = {};

    // 1. Strict RBAC Enforcement on employeeId
    if (requestingUser.role === UserRole.EMPLOYEE) {
      // Employee is forced to see only their own incentives
      filter.employeeId = new Types.ObjectId(requestingUser._id);
    } else if (query.employeeId) {
      filter.employeeId = new Types.ObjectId(query.employeeId);
    }

    // 2. Filter by status
    if (query.status) {
      filter.status = query.status;
    }

    // 3. Filter by orderId
    if (query.orderId) {
      filter.orderId = new Types.ObjectId(query.orderId);
    }

    // 4. Date range filter on createdAt
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        if (isNaN(start.getTime())) {
          throw new BadRequestException('Invalid startDate format');
        }
        filter.createdAt.$gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        if (isNaN(end.getTime())) {
          throw new BadRequestException('Invalid endDate format');
        }
        filter.createdAt.$lte = end;
      }
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.incentiveModel
        .find(filter)
        .populate('employeeId', 'name email phone')
        .populate({
          path: 'orderId',
          select: 'customer orderDate totalAmount status',
          populate: {
            path: 'customer',
            select: 'customerName businessName phone address',
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.incentiveModel.countDocuments(filter).exec(),
    ]);

    // Calculate summary metrics for the scoped query/user
    const summaryFilter: Record<string, any> = {};
    if (requestingUser.role === UserRole.EMPLOYEE) {
      summaryFilter.employeeId = new Types.ObjectId(requestingUser._id);
    } else if (query.employeeId) {
      summaryFilter.employeeId = new Types.ObjectId(query.employeeId);
    }

    const allScopedIncentives = await this.incentiveModel
      .find(summaryFilter)
      .exec();
    let totalPending = 0;
    let totalPaid = 0;
    let totalEarned = 0;

    for (const inc of allScopedIncentives) {
      const amt = Number(inc.incentiveAmount) || 0;
      totalEarned += amt;
      if (inc.status === IncentiveStatus.PAID) {
        totalPaid += amt;
      } else {
        totalPending += amt;
      }
    }

    totalEarned = Math.round(totalEarned * 100) / 100;
    totalPaid = Math.round(totalPaid * 100) / 100;
    totalPending = Math.round(totalPending * 100) / 100;

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalPending,
        totalPaid,
        totalEarned,
      },
    };
  }

  /**
   * Retrieves single incentive with authorization checks.
   */
  async findById(id: string, requestingUser: { _id: string; role: string }) {
    const incentive = await this.incentiveModel
      .findById(id)
      .populate('employeeId', 'name email phone')
      .populate({
        path: 'orderId',
        select: 'customer orderDate totalAmount status items notes',
        populate: {
          path: 'customer',
          select: 'customerName businessName phone address',
        },
      })
      .exec();

    if (!incentive) {
      throw new NotFoundException('Incentive not found');
    }

    // Strict RBAC: Employee can only view their own incentive
    if (requestingUser.role === UserRole.EMPLOYEE) {
      const empId = (incentive.employeeId as any)?._id || incentive.employeeId;
      if (empId.toString() !== requestingUser._id.toString()) {
        throw new ForbiddenException('You can only access your own incentives');
      }
    }

    return incentive;
  }

  /**
   * Retrieves incentive for a specific order.
   */
  async findByOrderId(
    orderId: string,
    requestingUser: { _id: string; role: string },
  ) {
    const incentive = await this.incentiveModel
      .findOne({ orderId })
      .populate('employeeId', 'name email phone')
      .exec();

    if (!incentive) {
      return null;
    }

    if (requestingUser.role === UserRole.EMPLOYEE) {
      const empId = (incentive.employeeId as any)?._id || incentive.employeeId;
      if (empId.toString() !== requestingUser._id.toString()) {
        throw new ForbiddenException('You can only access your own incentives');
      }
    }

    return incentive;
  }

  /**
   * Marks an UNPAID incentive as PAID.
   * Only ADMIN is authorized.
   */
  async markAsPaid(
    id: string,
    requestingUser: { _id: string; role: UserRole },
  ) {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only ADMIN can mark incentives as paid');
    }

    const incentive = await this.incentiveModel.findById(id).exec();
    if (!incentive) {
      throw new NotFoundException('Incentive not found');
    }

    if (incentive.status === IncentiveStatus.PAID) {
      throw new BadRequestException('Incentive is already marked as paid');
    }

    incentive.status = IncentiveStatus.PAID;
    incentive.paidAt = new Date();

    const saved = await incentive.save();
    return this.incentiveModel
      .findById(saved._id)
      .populate('employeeId', 'name email phone')
      .populate({
        path: 'orderId',
        select: 'customer orderDate totalAmount status',
        populate: {
          path: 'customer',
          select: 'customerName businessName phone address',
        },
      })
      .exec();
  }
}
