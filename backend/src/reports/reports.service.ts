// User instruction: "Phase 10: Reports - Create ReportsService with MongoDB aggregation pipelines for all 7 report dimensions"
// Importers/callers: backend/src/reports/reports.controller.ts, backend/src/reports/reports.module.ts, backend/src/reports/reports.service.spec.ts
// Affected API: /api/reports/visits/employees, /api/reports/orders/employees, /api/reports/sales/employees, /api/reports/expenses/employees, /api/reports/incentives/employees, /api/reports/customers/:customerId/visits, /api/reports/date-wise
// Data schemas: User, Customer, Visit, Order, Expense, Incentive, QueryReportsDto, QueryCustomerVisitsDto, EmployeeVisitReportDto, EmployeeOrderReportDto, EmployeeSalesReportDto, EmployeeExpenseReportDto, EmployeeIncentiveReportDto, CustomerVisitHistoryDto, DateWiseReportDto

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserRole } from '../users/schemas/user.schema.js';
import { Customer } from '../customers/schemas/customer.schema.js';
import { Visit } from '../visits/schemas/visit.schema.js';
import { Order, OrderStatus } from '../orders/schemas/order.schema.js';
import {
  Expense,
  ExpenseStatus,
  ExpenseType,
} from '../expenses/schemas/expense.schema.js';
import {
  Incentive,
  IncentiveStatus,
} from '../incentives/schemas/incentive.schema.js';
import {
  QueryCustomerVisitsDto,
  QueryReportsDto,
} from './dto/query-reports.dto.js';
import {
  CustomerVisitHistoryDto,
  CustomerVisitRecordDto,
  DateWiseReportDto,
  EmployeeExpenseReportDto,
  EmployeeIncentiveReportDto,
  EmployeeOrderReportDto,
  EmployeeSalesReportDto,
  EmployeeVisitReportDto,
} from './dto/report-responses.dto.js';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Customer.name) private readonly customerModel: Model<Customer>,
    @InjectModel(Visit.name) private readonly visitModel: Model<Visit>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<Expense>,
    @InjectModel(Incentive.name)
    private readonly incentiveModel: Model<Incentive>,
  ) {}

  /**
   * Helper: Round monetary values to 2 decimal places
   */
  public round(val: number): number {
    if (isNaN(val) || val === null || val === undefined) {
      return 0;
    }
    return Math.round(Number(val) * 100) / 100;
  }

  /**
   * Helper: Parse start and end date strings into UTC Date boundaries
   */
  public buildDateRange(
    startDate?: string,
    endDate?: string,
  ): { start?: Date; end?: Date } {
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) {
        s.setUTCHours(0, 0, 0, 0);
        start = s;
      }
    }
    if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) {
        e.setUTCHours(23, 59, 59, 999);
        end = e;
      }
    }

    return { start, end };
  }

  /**
   * Helper: Build $match date filter object for a given field
   */
  public getDateMatch(
    dateField: string,
    start?: Date,
    end?: Date,
  ): Record<string, any> {
    if (start && end) {
      return { [dateField]: { $gte: start, $lte: end } };
    }
    if (start) {
      return { [dateField]: { $gte: start } };
    }
    if (end) {
      return { [dateField]: { $lte: end } };
    }
    return {};
  }

  /**
   * Helper: Enforce RBAC employee scoping
   * If requesting user is an EMPLOYEE, always use their authenticated ID.
   * If requesting user is an ADMIN, allow optional query.employeeId filter.
   */
  private getEffectiveEmployeeId(
    requestingUser: any,
    requestedEmployeeId?: string,
  ): string | undefined {
    const isEmployee = requestingUser?.role === UserRole.EMPLOYEE;
    if (isEmployee) {
      return (
        requestingUser.userId ||
        requestingUser.sub ||
        requestingUser._id?.toString()
      );
    }
    return requestedEmployeeId;
  }

  /**
   * 1. GET /reports/visits/employees
   * Employee-wise visits aggregation
   */
  async getEmployeeVisits(
    query: QueryReportsDto,
    requestingUser: any,
  ): Promise<EmployeeVisitReportDto[]> {
    const effectiveEmployeeId = this.getEffectiveEmployeeId(
      requestingUser,
      query.employeeId,
    );
    const { start, end } = this.buildDateRange(query.startDate, query.endDate);

    const match: Record<string, any> = {};
    if (effectiveEmployeeId) {
      if (!Types.ObjectId.isValid(effectiveEmployeeId)) {
        throw new BadRequestException('Invalid employee ID format');
      }
      match.employee = new Types.ObjectId(effectiveEmployeeId);
    }
    const dateMatch = this.getDateMatch('visitDate', start, end);
    Object.assign(match, dateMatch);

    const results = await this.visitModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$employee',
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDoc',
          },
        },
        {
          $project: {
            employeeId: { $toString: '$_id' },
            employeeName: {
              $ifNull: [
                { $arrayElemAt: ['$userDoc.name', 0] },
                'Unknown Employee',
              ],
            },
            count: 1,
          },
        },
        { $sort: { count: -1, employeeName: 1 } },
      ])
      .exec();

    // If single employee requested and no visit records exist, return zero row if user exists
    if (effectiveEmployeeId && results.length === 0) {
      const user = await this.userModel
        .findById(effectiveEmployeeId)
        .lean()
        .exec();
      if (user) {
        return [
          {
            employeeId: user._id.toString(),
            employeeName: user.name,
            count: 0,
          },
        ];
      }
    }

    return results;
  }

  /**
   * 2. GET /reports/orders/employees
   * Employee-wise order counts by status
   */
  async getEmployeeOrders(
    query: QueryReportsDto,
    requestingUser: any,
  ): Promise<EmployeeOrderReportDto[]> {
    const effectiveEmployeeId = this.getEffectiveEmployeeId(
      requestingUser,
      query.employeeId,
    );
    const { start, end } = this.buildDateRange(query.startDate, query.endDate);

    const match: Record<string, any> = {};
    if (effectiveEmployeeId) {
      if (!Types.ObjectId.isValid(effectiveEmployeeId)) {
        throw new BadRequestException('Invalid employee ID format');
      }
      match.employee = new Types.ObjectId(effectiveEmployeeId);
    }
    if (query.status) {
      match.status = query.status;
    }
    const dateMatch = this.getDateMatch('orderDate', start, end);
    Object.assign(match, dateMatch);

    const results = await this.orderModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              employee: '$employee',
              status: '$status',
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.employee',
            statuses: {
              $push: {
                status: '$_id.status',
                count: '$count',
              },
            },
            totalOrders: { $sum: '$count' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDoc',
          },
        },
        {
          $project: {
            employeeId: { $toString: '$_id' },
            employeeName: {
              $ifNull: [
                { $arrayElemAt: ['$userDoc.name', 0] },
                'Unknown Employee',
              ],
            },
            statuses: 1,
            totalOrders: 1,
          },
        },
        { $sort: { totalOrders: -1, employeeName: 1 } },
      ])
      .exec();

    const formatted: EmployeeOrderReportDto[] = results.map((item: any) => {
      let pendingOrders = 0;
      let approvedOrders = 0;
      let rejectedOrders = 0;
      let completedOrders = 0;
      let cancelledOrders = 0;

      (item.statuses || []).forEach((st: any) => {
        if (st.status === OrderStatus.PENDING) pendingOrders = st.count;
        if (st.status === OrderStatus.APPROVED) approvedOrders = st.count;
        if (st.status === OrderStatus.REJECTED) rejectedOrders = st.count;
        if (st.status === OrderStatus.COMPLETED) completedOrders = st.count;
        if (st.status === OrderStatus.CANCELLED) cancelledOrders = st.count;
      });

      return {
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        totalOrders: item.totalOrders || 0,
        pendingOrders,
        approvedOrders,
        rejectedOrders,
        completedOrders,
        cancelledOrders,
      };
    });

    // If single employee requested and no records found, return empty metrics row
    if (effectiveEmployeeId && formatted.length === 0) {
      const user = await this.userModel
        .findById(effectiveEmployeeId)
        .lean()
        .exec();
      if (user) {
        return [
          {
            employeeId: user._id.toString(),
            employeeName: user.name,
            totalOrders: 0,
            pendingOrders: 0,
            approvedOrders: 0,
            rejectedOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0,
          },
        ];
      }
    }

    return formatted;
  }

  /**
   * 3. GET /reports/sales/employees
   * Employee-wise sales / order values using stored authoritative totals
   */
  async getEmployeeSales(
    query: QueryReportsDto,
    requestingUser: any,
  ): Promise<EmployeeSalesReportDto[]> {
    const effectiveEmployeeId = this.getEffectiveEmployeeId(
      requestingUser,
      query.employeeId,
    );
    const { start, end } = this.buildDateRange(query.startDate, query.endDate);

    const match: Record<string, any> = {};
    if (effectiveEmployeeId) {
      if (!Types.ObjectId.isValid(effectiveEmployeeId)) {
        throw new BadRequestException('Invalid employee ID format');
      }
      match.employee = new Types.ObjectId(effectiveEmployeeId);
    }
    const dateMatch = this.getDateMatch('orderDate', start, end);
    Object.assign(match, dateMatch);

    const results = await this.orderModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$employee',
            orderCount: { $sum: 1 },
            totalOrderValue: { $sum: '$totalAmount' },
            approvedOrderValue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', OrderStatus.APPROVED] },
                  '$totalAmount',
                  0,
                ],
              },
            },
            completedOrderValue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', OrderStatus.COMPLETED] },
                  '$totalAmount',
                  0,
                ],
              },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDoc',
          },
        },
        {
          $project: {
            employeeId: { $toString: '$_id' },
            employeeName: {
              $ifNull: [
                { $arrayElemAt: ['$userDoc.name', 0] },
                'Unknown Employee',
              ],
            },
            orderCount: 1,
            totalOrderValue: 1,
            approvedOrderValue: 1,
            completedOrderValue: 1,
          },
        },
        { $sort: { totalOrderValue: -1, employeeName: 1 } },
      ])
      .exec();

    const formatted: EmployeeSalesReportDto[] = results.map((item: any) => ({
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      orderCount: item.orderCount || 0,
      totalOrderValue: this.round(item.totalOrderValue || 0),
      approvedOrderValue: this.round(item.approvedOrderValue || 0),
      completedOrderValue: this.round(item.completedOrderValue || 0),
    }));

    if (effectiveEmployeeId && formatted.length === 0) {
      const user = await this.userModel
        .findById(effectiveEmployeeId)
        .lean()
        .exec();
      if (user) {
        return [
          {
            employeeId: user._id.toString(),
            employeeName: user.name,
            orderCount: 0,
            totalOrderValue: 0,
            approvedOrderValue: 0,
            completedOrderValue: 0,
          },
        ];
      }
    }

    return formatted;
  }

  /**
   * 4. GET /reports/expenses/employees
   * Employee-wise expenses breakdown
   */
  async getEmployeeExpenses(
    query: QueryReportsDto,
    requestingUser: any,
  ): Promise<EmployeeExpenseReportDto[]> {
    const effectiveEmployeeId = this.getEffectiveEmployeeId(
      requestingUser,
      query.employeeId,
    );
    const { start, end } = this.buildDateRange(query.startDate, query.endDate);

    const match: Record<string, any> = {};
    if (effectiveEmployeeId) {
      if (!Types.ObjectId.isValid(effectiveEmployeeId)) {
        throw new BadRequestException('Invalid employee ID format');
      }
      match.employee = new Types.ObjectId(effectiveEmployeeId);
    }
    if (query.status) {
      match.status = query.status;
    }
    if (query.type) {
      match.type = query.type;
    }
    const dateMatch = this.getDateMatch('date', start, end);
    Object.assign(match, dateMatch);

    const results = await this.expenseModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$employee',
            expenseCount: { $sum: 1 },
            totalSubmittedExpenses: { $sum: '$amount' },
            pendingExpenseAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ExpenseStatus.PENDING] },
                  '$amount',
                  0,
                ],
              },
            },
            approvedExpenseAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ExpenseStatus.APPROVED] },
                  '$amount',
                  0,
                ],
              },
            },
            rejectedExpenseAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ExpenseStatus.REJECTED] },
                  '$amount',
                  0,
                ],
              },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDoc',
          },
        },
        {
          $project: {
            employeeId: { $toString: '$_id' },
            employeeName: {
              $ifNull: [
                { $arrayElemAt: ['$userDoc.name', 0] },
                'Unknown Employee',
              ],
            },
            expenseCount: 1,
            totalSubmittedExpenses: 1,
            pendingExpenseAmount: 1,
            approvedExpenseAmount: 1,
            rejectedExpenseAmount: 1,
          },
        },
        { $sort: { totalSubmittedExpenses: -1, employeeName: 1 } },
      ])
      .exec();

    const formatted: EmployeeExpenseReportDto[] = results.map((item: any) => ({
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      totalSubmittedExpenses: this.round(item.totalSubmittedExpenses || 0),
      pendingExpenseAmount: this.round(item.pendingExpenseAmount || 0),
      approvedExpenseAmount: this.round(item.approvedExpenseAmount || 0),
      rejectedExpenseAmount: this.round(item.rejectedExpenseAmount || 0),
      expenseCount: item.expenseCount || 0,
    }));

    if (effectiveEmployeeId && formatted.length === 0) {
      const user = await this.userModel
        .findById(effectiveEmployeeId)
        .lean()
        .exec();
      if (user) {
        return [
          {
            employeeId: user._id.toString(),
            employeeName: user.name,
            totalSubmittedExpenses: 0,
            pendingExpenseAmount: 0,
            approvedExpenseAmount: 0,
            rejectedExpenseAmount: 0,
            expenseCount: 0,
          },
        ];
      }
    }

    return formatted;
  }

  /**
   * 5. GET /reports/incentives/employees
   * Employee-wise incentives using stored records
   */
  async getEmployeeIncentives(
    query: QueryReportsDto,
    requestingUser: any,
  ): Promise<EmployeeIncentiveReportDto[]> {
    const effectiveEmployeeId = this.getEffectiveEmployeeId(
      requestingUser,
      query.employeeId,
    );
    const { start, end } = this.buildDateRange(query.startDate, query.endDate);

    const match: Record<string, any> = {};
    if (effectiveEmployeeId) {
      if (!Types.ObjectId.isValid(effectiveEmployeeId)) {
        throw new BadRequestException('Invalid employee ID format');
      }
      match.employeeId = new Types.ObjectId(effectiveEmployeeId);
    }
    const statusFilter = query.status || query.paymentStatus;
    if (statusFilter) {
      match.status = statusFilter;
    }
    const dateMatch = this.getDateMatch('createdAt', start, end);
    Object.assign(match, dateMatch);

    const results = await this.incentiveModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$employeeId',
            incentiveCount: { $sum: 1 },
            totalIncentives: { $sum: '$incentiveAmount' },
            unpaidIncentives: {
              $sum: {
                $cond: [
                  { $eq: ['$status', IncentiveStatus.UNPAID] },
                  '$incentiveAmount',
                  0,
                ],
              },
            },
            paidIncentives: {
              $sum: {
                $cond: [
                  { $eq: ['$status', IncentiveStatus.PAID] },
                  '$incentiveAmount',
                  0,
                ],
              },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDoc',
          },
        },
        {
          $project: {
            employeeId: { $toString: '$_id' },
            employeeName: {
              $ifNull: [
                { $arrayElemAt: ['$userDoc.name', 0] },
                'Unknown Employee',
              ],
            },
            incentiveCount: 1,
            totalIncentives: 1,
            unpaidIncentives: 1,
            paidIncentives: 1,
          },
        },
        { $sort: { totalIncentives: -1, employeeName: 1 } },
      ])
      .exec();

    const formatted: EmployeeIncentiveReportDto[] = results.map(
      (item: any) => ({
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        totalIncentives: this.round(item.totalIncentives || 0),
        unpaidIncentives: this.round(item.unpaidIncentives || 0),
        paidIncentives: this.round(item.paidIncentives || 0),
        incentiveCount: item.incentiveCount || 0,
      }),
    );

    if (effectiveEmployeeId && formatted.length === 0) {
      const user = await this.userModel
        .findById(effectiveEmployeeId)
        .lean()
        .exec();
      if (user) {
        return [
          {
            employeeId: user._id.toString(),
            employeeName: user.name,
            totalIncentives: 0,
            unpaidIncentives: 0,
            paidIncentives: 0,
            incentiveCount: 0,
          },
        ];
      }
    }

    return formatted;
  }

  /**
   * 6. GET /reports/customers/:customerId/visits
   * Customer visit history chronologically (newest first)
   * ADMIN: can view any customer.
   * EMPLOYEE: strictly limited to customers assigned to them.
   */
  async getCustomerVisitHistory(
    customerId: string,
    query: QueryCustomerVisitsDto,
    requestingUser: any,
  ): Promise<CustomerVisitHistoryDto> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer ID format');
    }

    const customer = await this.customerModel
      .findById(customerId)
      .populate('assignedEmployee', 'name')
      .lean()
      .exec();

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Role-based customer ownership check
    const isEmployee = requestingUser?.role === UserRole.EMPLOYEE;
    const currentUserId =
      requestingUser?.userId ||
      requestingUser?.sub ||
      requestingUser?._id?.toString();

    if (isEmployee) {
      const assignedEmployeeId =
        (customer.assignedEmployee as any)?._id?.toString() ||
        customer.assignedEmployee?.toString();
      if (assignedEmployeeId !== currentUserId) {
        throw new ForbiddenException(
          'You are not authorized to view this customer visit history',
        );
      }
    }

    const { start, end } = this.buildDateRange(query.startDate, query.endDate);
    const match: Record<string, any> = {
      customer: new Types.ObjectId(customerId),
    };
    const dateMatch = this.getDateMatch('visitDate', start, end);
    Object.assign(match, dateMatch);

    const visits = await this.visitModel
      .aggregate([
        { $match: match },
        { $sort: { visitDate: -1 } },
        {
          $lookup: {
            from: 'users',
            localField: 'employee',
            foreignField: '_id',
            as: 'employeeDoc',
          },
        },
        {
          $project: {
            id: { $toString: '$_id' },
            visitDate: 1,
            employeeId: { $toString: '$employee' },
            employeeName: {
              $ifNull: [
                { $arrayElemAt: ['$employeeDoc.name', 0] },
                'Unknown Employee',
              ],
            },
            purpose: 1,
            notes: 1,
            result: 1,
            followUpDate: 1,
            photoUrl: 1,
            latitude: 1,
            longitude: 1,
          },
        },
      ])
      .exec();

    const assignedEmp = customer.assignedEmployee as any;
    const customerSummary = {
      id: customer._id.toString(),
      customerName: customer.customerName,
      businessName: customer.businessName,
      phone: customer.phone,
      address: customer.address,
      status: customer.status,
      assignedEmployeeId: assignedEmp?._id
        ? assignedEmp._id.toString()
        : assignedEmp?.toString(),
      assignedEmployeeName: assignedEmp?.name || undefined,
    };

    return {
      customer: customerSummary,
      visits: visits.map((v: any) => ({
        id: v.id,
        visitDate: v.visitDate,
        employeeId: v.employeeId,
        employeeName: v.employeeName,
        purpose: v.purpose,
        notes: v.notes,
        result: v.result,
        followUpDate: v.followUpDate,
        photoUrl: v.photoUrl,
        latitude: v.latitude,
        longitude: v.longitude,
      })),
    };
  }

  /**
   * 7. GET /reports/date-wise
   * Aggregated daily operational metrics
   */
  async getDateWiseReport(
    query: QueryReportsDto,
    requestingUser: any,
  ): Promise<DateWiseReportDto[]> {
    const effectiveEmployeeId = this.getEffectiveEmployeeId(
      requestingUser,
      query.employeeId,
    );
    const { start, end } = this.buildDateRange(query.startDate, query.endDate);

    let empObjId: Types.ObjectId | undefined;
    if (effectiveEmployeeId) {
      if (!Types.ObjectId.isValid(effectiveEmployeeId)) {
        throw new BadRequestException('Invalid employee ID format');
      }
      empObjId = new Types.ObjectId(effectiveEmployeeId);
    }

    // 1. Visits daily aggregation (visitDate)
    const visitMatch: Record<string, any> = {};
    if (empObjId) visitMatch.employee = empObjId;
    Object.assign(visitMatch, this.getDateMatch('visitDate', start, end));

    const visitPromise = this.visitModel
      .aggregate([
        { $match: visitMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$visitDate' },
            },
            visits: { $sum: 1 },
          },
        },
      ])
      .exec();

    // 2. Orders daily aggregation (orderDate)
    const orderMatch: Record<string, any> = {};
    if (empObjId) orderMatch.employee = empObjId;
    Object.assign(orderMatch, this.getDateMatch('orderDate', start, end));

    const orderPromise = this.orderModel
      .aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$orderDate' },
            },
            orders: { $sum: 1 },
            orderValue: { $sum: '$totalAmount' },
            approvedOrders: {
              $sum: {
                $cond: [{ $eq: ['$status', OrderStatus.APPROVED] }, 1, 0],
              },
            },
            approvedOrderValue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', OrderStatus.APPROVED] },
                  '$totalAmount',
                  0,
                ],
              },
            },
            completedOrders: {
              $sum: {
                $cond: [{ $eq: ['$status', OrderStatus.COMPLETED] }, 1, 0],
              },
            },
            completedOrderValue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', OrderStatus.COMPLETED] },
                  '$totalAmount',
                  0,
                ],
              },
            },
          },
        },
      ])
      .exec();

    // 3. Expenses daily aggregation (date)
    const expenseMatch: Record<string, any> = {};
    if (empObjId) expenseMatch.employee = empObjId;
    Object.assign(expenseMatch, this.getDateMatch('date', start, end));

    const expensePromise = this.expenseModel
      .aggregate([
        { $match: expenseMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$date' },
            },
            expenses: { $sum: '$amount' },
            expenseCount: { $sum: 1 },
            approvedExpenses: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ExpenseStatus.APPROVED] },
                  '$amount',
                  0,
                ],
              },
            },
          },
        },
      ])
      .exec();

    // 4. Incentives daily aggregation (createdAt)
    const incentiveMatch: Record<string, any> = {};
    if (empObjId) incentiveMatch.employeeId = empObjId;
    Object.assign(incentiveMatch, this.getDateMatch('createdAt', start, end));

    const incentivePromise = this.incentiveModel
      .aggregate([
        { $match: incentiveMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            incentives: { $sum: '$incentiveAmount' },
            incentiveCount: { $sum: 1 },
            paidIncentives: {
              $sum: {
                $cond: [
                  { $eq: ['$status', IncentiveStatus.PAID] },
                  '$incentiveAmount',
                  0,
                ],
              },
            },
          },
        },
      ])
      .exec();

    const [visitRes, orderRes, expenseRes, incentiveRes] = await Promise.all([
      visitPromise,
      orderPromise,
      expensePromise,
      incentivePromise,
    ]);

    // Consolidate map of all dates
    const dateMap = new Map<string, DateWiseReportDto>();

    const getOrCreateDateEntry = (date: string): DateWiseReportDto => {
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          visits: 0,
          orders: 0,
          orderValue: 0,
          approvedOrders: 0,
          approvedOrderValue: 0,
          completedOrders: 0,
          completedOrderValue: 0,
          expenses: 0,
          expenseCount: 0,
          approvedExpenses: 0,
          incentives: 0,
          incentiveCount: 0,
          paidIncentives: 0,
        });
      }
      return dateMap.get(date)!;
    };

    visitRes.forEach((item: any) => {
      if (item._id) {
        const entry = getOrCreateDateEntry(item._id);
        entry.visits = item.visits || 0;
      }
    });

    orderRes.forEach((item: any) => {
      if (item._id) {
        const entry = getOrCreateDateEntry(item._id);
        entry.orders = item.orders || 0;
        entry.orderValue = this.round(item.orderValue || 0);
        entry.approvedOrders = item.approvedOrders || 0;
        entry.approvedOrderValue = this.round(item.approvedOrderValue || 0);
        entry.completedOrders = item.completedOrders || 0;
        entry.completedOrderValue = this.round(item.completedOrderValue || 0);
      }
    });

    expenseRes.forEach((item: any) => {
      if (item._id) {
        const entry = getOrCreateDateEntry(item._id);
        entry.expenses = this.round(item.expenses || 0);
        entry.expenseCount = item.expenseCount || 0;
        entry.approvedExpenses = this.round(item.approvedExpenses || 0);
      }
    });

    incentiveRes.forEach((item: any) => {
      if (item._id) {
        const entry = getOrCreateDateEntry(item._id);
        entry.incentives = this.round(item.incentives || 0);
        entry.incentiveCount = item.incentiveCount || 0;
        entry.paidIncentives = this.round(item.paidIncentives || 0);
      }
    });

    // Convert map to sorted array (ascending by date)
    const sortedDates = Array.from(dateMap.keys()).sort();
    return sortedDates.map((date) => dateMap.get(date)!);
  }
}
