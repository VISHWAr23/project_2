// User instruction: "Phase 8: Expense Management - Create ExpensesService with RBAC, state machine, monetary rounding, aggregations, and receipt upload"
// Importers/callers: backend/src/expenses/expenses.controller.ts, backend/src/expenses/expenses.module.ts, backend/src/expenses/expenses.service.spec.ts
// Affected API: /api/expenses (findAll, findById, create, update, approve, reject, uploadReceipt)
// Data schemas: Expense, ExpenseType, ExpenseStatus, User, CreateExpenseDto, UpdateExpenseDto, QueryExpenseDto, RejectExpenseDto

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Expense,
  ExpenseStatus,
  ExpenseType,
} from './schemas/expense.schema.js';
import { User, UserRole } from '../users/schemas/user.schema.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { QueryExpenseDto } from './dto/query-expense.dto.js';
import { RejectExpenseDto } from './dto/reject-expense.dto.js';
import { StorageService } from '../common/storage/storage.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name) private expenseModel: Model<Expense>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly storageService: StorageService,
    private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Deterministic monetary rounding strategy:
   * Rounds expense amount to 2 decimal places to prevent floating-point drift.
   */
  public calculateAmount(amount: number): number {
    if (
      isNaN(amount) ||
      amount === null ||
      amount === undefined ||
      Number(amount) < 0.01
    ) {
      throw new BadRequestException(
        'Amount must be a positive number greater than or equal to 0.01',
      );
    }
    return Math.round(Number(amount) * 100) / 100;
  }

  /**
   * Centralized Expense State Machine validation
   */
  public validateTransition(
    currentStatus: ExpenseStatus,
    targetStatus: ExpenseStatus,
    role: UserRole | string,
  ): void {
    if (currentStatus === targetStatus) {
      throw new BadRequestException(
        `Expense is already in ${currentStatus} status`,
      );
    }

    // Terminal states cannot transition to anything
    if (
      currentStatus === ExpenseStatus.APPROVED ||
      currentStatus === ExpenseStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot transition expense from terminal state ${currentStatus} to ${targetStatus}`,
      );
    }

    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can approve or reject expenses',
      );
    }

    if (
      targetStatus !== ExpenseStatus.APPROVED &&
      targetStatus !== ExpenseStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Invalid target expense status: ${targetStatus}`,
      );
    }
  }

  /**
   * Create an expense record.
   * Employees can only create expenses for themselves.
   * Admins can optionally create on behalf of an employee.
   */
  async create(
    createExpenseDto: CreateExpenseDto,
    requestingUser: { _id: string; role: string },
  ) {
    // 1. Verify requesting user exists and is active
    const user = await this.userModel.findById(requestingUser._id).exec();
    if (!user || !user.isActive) {
      throw new ForbiddenException('User account is inactive or not found');
    }

    // 2. Validate employee assignment
    let employeeId = requestingUser._id;
    if (requestingUser.role === UserRole.ADMIN && createExpenseDto.employee) {
      const targetEmployee = await this.userModel
        .findById(createExpenseDto.employee)
        .exec();
      if (!targetEmployee) {
        throw new BadRequestException('Target employee does not exist');
      }
      if (!targetEmployee.isActive) {
        throw new BadRequestException('Target employee is inactive');
      }
      employeeId = targetEmployee._id.toString();
    }

    // 3. Process and round amount
    const amount = this.calculateAmount(createExpenseDto.amount);

    // 4. Validate expense date
    const expenseDate = createExpenseDto.date
      ? new Date(createExpenseDto.date)
      : new Date();
    if (isNaN(expenseDate.getTime())) {
      throw new BadRequestException('Invalid expense date format');
    }

    // 5. Validate description
    if (!createExpenseDto.description || !createExpenseDto.description.trim()) {
      throw new BadRequestException('Expense description is required');
    }

    // 6. Create record - strictly default status to PENDING and sanitize reviewer fields
    const createdExpense = new this.expenseModel({
      employee: new Types.ObjectId(employeeId),
      date: expenseDate,
      type: createExpenseDto.type,
      amount,
      description: createExpenseDto.description.trim(),
      receiptUrl: createExpenseDto.receiptUrl
        ? createExpenseDto.receiptUrl.trim()
        : undefined,
      status: ExpenseStatus.PENDING,
    });

    const saved = await createdExpense.save();
    if (this.notificationsService) {
      this.notificationsService.notifyExpenseSubmitted(saved).catch(() => {});
    }
    return this.findById(saved._id.toString(), requestingUser);
  }

  /**
   * List expenses with filters, pagination, and aggregate financial metrics.
   * Employees see only their own expenses; Admins see all or filter by employee.
   */
  async findAll(
    query: QueryExpenseDto,
    requestingUser: { _id: string; role: string },
  ) {
    const {
      page = 1,
      limit = 10,
      employeeId,
      type,
      status,
      startDate,
      endDate,
    } = query;

    const filter: Record<string, any> = {};

    // Strict RBAC filtering
    if (requestingUser.role === UserRole.EMPLOYEE) {
      filter.employee = new Types.ObjectId(requestingUser._id);
    } else if (requestingUser.role === UserRole.ADMIN && employeeId) {
      filter.employee = new Types.ObjectId(employeeId);
    }

    if (type) {
      filter.type = type;
    }
    if (status) {
      filter.status = status;
    }
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!endDate.includes('T')) {
          end.setUTCHours(23, 59, 59, 999);
        }
        filter.date.$lte = end;
      }
    }

    const skip = (page - 1) * limit;

    const [items, total, summaryAggregation] = await Promise.all([
      this.expenseModel
        .find(filter)
        .populate('employee', 'name email phone')
        .populate('reviewedBy', 'name email')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.expenseModel.countDocuments(filter).exec(),
      this.expenseModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalCount: { $sum: 1 },
            pendingAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ExpenseStatus.PENDING] },
                  '$amount',
                  0,
                ],
              },
            },
            pendingCount: {
              $sum: {
                $cond: [{ $eq: ['$status', ExpenseStatus.PENDING] }, 1, 0],
              },
            },
            approvedAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ExpenseStatus.APPROVED] },
                  '$amount',
                  0,
                ],
              },
            },
            approvedCount: {
              $sum: {
                $cond: [{ $eq: ['$status', ExpenseStatus.APPROVED] }, 1, 0],
              },
            },
            rejectedAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ExpenseStatus.REJECTED] },
                  '$amount',
                  0,
                ],
              },
            },
            rejectedCount: {
              $sum: {
                $cond: [{ $eq: ['$status', ExpenseStatus.REJECTED] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const agg = summaryAggregation[0] || {};
    const summary = {
      totalAmount: Math.round((agg.totalAmount || 0) * 100) / 100,
      totalCount: agg.totalCount || 0,
      pendingAmount: Math.round((agg.pendingAmount || 0) * 100) / 100,
      pendingCount: agg.pendingCount || 0,
      approvedAmount: Math.round((agg.approvedAmount || 0) * 100) / 100,
      approvedCount: agg.approvedCount || 0,
      rejectedAmount: Math.round((agg.rejectedAmount || 0) * 100) / 100,
      rejectedCount: agg.rejectedCount || 0,
    };

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary,
    };
  }

  /**
   * Find expense by ID with RBAC isolation
   */
  async findById(id: string, requestingUser: { _id: string; role: string }) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Expense not found');
    }

    const expense = await this.expenseModel
      .findById(id)
      .populate('employee', 'name email phone')
      .populate('reviewedBy', 'name email')
      .exec();

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (requestingUser.role === UserRole.EMPLOYEE) {
      const employeeObjId = (expense.employee as any)?._id || expense.employee;
      if (employeeObjId.toString() !== requestingUser._id.toString()) {
        throw new ForbiddenException('You can only access your own expenses');
      }
    }

    return expense;
  }

  /**
   * Update a pending expense.
   * Only PENDING expenses can be updated.
   * Employees can only update their own expenses.
   */
  async update(
    id: string,
    updateExpenseDto: UpdateExpenseDto,
    requestingUser: { _id: string; role: string },
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Expense not found');
    }

    const expense = await this.expenseModel.findById(id).exec();
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (requestingUser.role === UserRole.EMPLOYEE) {
      const employeeObjId = (expense.employee as any)?._id || expense.employee;
      if (employeeObjId.toString() !== requestingUser._id.toString()) {
        throw new ForbiddenException('You can only update your own expenses');
      }
    }

    if (expense.status !== ExpenseStatus.PENDING) {
      throw new BadRequestException('Only PENDING expenses can be updated');
    }

    if (updateExpenseDto.date) {
      const expenseDate = new Date(updateExpenseDto.date);
      if (isNaN(expenseDate.getTime())) {
        throw new BadRequestException('Invalid expense date format');
      }
      expense.date = expenseDate;
    }

    if (updateExpenseDto.type) {
      expense.type = updateExpenseDto.type;
    }

    if (updateExpenseDto.amount !== undefined) {
      expense.amount = this.calculateAmount(updateExpenseDto.amount);
    }

    if (updateExpenseDto.description !== undefined) {
      if (!updateExpenseDto.description.trim()) {
        throw new BadRequestException('Expense description cannot be empty');
      }
      expense.description = updateExpenseDto.description.trim();
    }

    if (updateExpenseDto.receiptUrl !== undefined) {
      expense.receiptUrl = updateExpenseDto.receiptUrl
        ? updateExpenseDto.receiptUrl.trim()
        : undefined;
    }

    await expense.save();
    return this.findById(expense._id.toString(), requestingUser);
  }

  /**
   * Approve a pending expense (Admin only)
   */
  async approve(id: string, requestingUser: { _id: string; role: string }) {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can approve expenses');
    }

    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Expense not found');
    }

    const expense = await this.expenseModel.findById(id).exec();
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    this.validateTransition(
      expense.status,
      ExpenseStatus.APPROVED,
      requestingUser.role,
    );

    expense.status = ExpenseStatus.APPROVED;
    expense.reviewedBy = new Types.ObjectId(requestingUser._id);
    expense.reviewedAt = new Date();
    expense.rejectionReason = undefined;

    await expense.save();
    if (this.notificationsService) {
      this.notificationsService.notifyExpenseApproved(expense).catch(() => {});
    }
    return this.findById(expense._id.toString(), requestingUser);
  }

  /**
   * Reject a pending expense (Admin only, reason required)
   */
  async reject(
    id: string,
    rejectExpenseDto: RejectExpenseDto,
    requestingUser: { _id: string; role: string },
  ) {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can reject expenses');
    }

    if (!rejectExpenseDto.reason || !rejectExpenseDto.reason.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Expense not found');
    }

    const expense = await this.expenseModel.findById(id).exec();
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    this.validateTransition(
      expense.status,
      ExpenseStatus.REJECTED,
      requestingUser.role,
    );

    expense.status = ExpenseStatus.REJECTED;
    expense.reviewedBy = new Types.ObjectId(requestingUser._id);
    expense.reviewedAt = new Date();
    expense.rejectionReason = rejectExpenseDto.reason.trim();

    await expense.save();
    if (this.notificationsService) {
      this.notificationsService.notifyExpenseRejected(expense).catch(() => {});
    }
    return this.findById(expense._id.toString(), requestingUser);
  }

  /**
   * Upload expense receipt with MIME type and size validation
   */
  async uploadReceipt(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Receipt file is required');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF, PDF',
      );
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        'File size exceeds maximum allowed limit of 5MB',
      );
    }

    const result = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    return {
      url: result.url,
      key: result.key,
      mimetype: result.mimetype,
      size: result.size,
    };
  }
}
