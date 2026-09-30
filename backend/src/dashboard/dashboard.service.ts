// User instruction: "Phase 9: Dashboard - Create DashboardService with MongoDB aggregation pipelines for Admin and Employee dashboards"
// Importers/callers: backend/src/dashboard/dashboard.controller.ts, backend/src/dashboard/dashboard.module.ts, backend/src/dashboard/dashboard.service.spec.ts
// Affected API: GET /api/dashboard/admin, GET /api/dashboard/employee
// Data schemas: AdminDashboardDto, EmployeeDashboardDto, QueryDashboardDto, User, Customer, Visit, Order, Incentive, Expense

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserRole } from '../users/schemas/user.schema.js';
import { Customer } from '../customers/schemas/customer.schema.js';
import { Visit } from '../visits/schemas/visit.schema.js';
import { Order, OrderStatus } from '../orders/schemas/order.schema.js';
import {
  Incentive,
  IncentiveStatus,
} from '../incentives/schemas/incentive.schema.js';
import {
  Expense,
  ExpenseStatus,
  ExpenseType,
} from '../expenses/schemas/expense.schema.js';
import { QueryDashboardDto } from './dto/query-dashboard.dto.js';
import {
  AdminDashboardDto,
  AdminOrdersDto,
  AdminExpensesDto,
  AdminIncentivesDto,
  AdminVisitsDto,
  AdminCustomersDto,
  AdminSummaryDto,
  AdminPendingApprovalsDto,
  EmployeePerformanceDto,
  DateWiseMetricDto,
  ExpenseByTypeDto,
  EmployeeMetricDto,
  AdminRecentVisitDto,
} from './dto/admin-dashboard.dto.js';
import {
  EmployeeDashboardDto,
  EmployeeSummaryDto,
  EmployeeCustomersDto,
  EmployeeVisitsDto,
  EmployeeOrdersDto,
  EmployeeExpensesDto,
  EmployeeIncentivesDto,
  EmployeeRecentVisitDto,
  EmployeeRecentOrderDto,
} from './dto/employee-dashboard.dto.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(Visit.name) private visitModel: Model<Visit>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Incentive.name) private incentiveModel: Model<Incentive>,
    @InjectModel(Expense.name) private expenseModel: Model<Expense>,
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
   * Admin Dashboard: Aggregate metrics across the entire organization
   */
  async getAdminDashboard(
    query: QueryDashboardDto,
  ): Promise<AdminDashboardDto> {
    const { start, end } = this.buildDateRange(query.startDate, query.endDate);

    // 1. Fetch active employees
    const activeEmployees = await this.userModel
      .find(
        { role: UserRole.EMPLOYEE, isActive: true },
        { _id: 1, name: 1, email: 1 },
      )
      .lean()
      .exec();

    const employeeMap = new Map<string, { name: string; email: string }>();
    activeEmployees.forEach((emp) => {
      employeeMap.set(emp._id.toString(), {
        name: emp.name,
        email: emp.email,
      });
    });

    // 2. Aggregation: Customers
    const customerAggregationPromise = this.customerModel
      .aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            byEmployee: [
              { $group: { _id: '$assignedEmployee', count: { $sum: 1 } } },
            ],
          },
        },
      ])
      .exec();

    // 3. Aggregation: Visits (visitDate)
    const visitMatch = this.getDateMatch('visitDate', start, end);
    const visitAggregationPromise = this.visitModel
      .aggregate([
        { $match: visitMatch },
        {
          $facet: {
            total: [{ $count: 'count' }],
            byEmployee: [{ $group: { _id: '$employee', count: { $sum: 1 } } }],
            recent: [
              { $sort: { visitDate: -1 } },
              { $limit: 5 },
              {
                $lookup: {
                  from: 'customers',
                  localField: 'customer',
                  foreignField: '_id',
                  as: 'customerDoc',
                },
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'employee',
                  foreignField: '_id',
                  as: 'employeeDoc',
                },
              },
            ],
          },
        },
      ])
      .exec();

    // 4. Aggregation: Orders (orderDate)
    const orderMatch = this.getDateMatch('orderDate', start, end);
    const orderAggregationPromise = this.orderModel
      .aggregate([
        { $match: orderMatch },
        {
          $facet: {
            byStatus: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$totalAmount' },
                },
              },
            ],
            byEmployee: [
              {
                $group: {
                  _id: '$employee',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$totalAmount' },
                },
              },
            ],
            dateWise: [
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$orderDate' },
                  },
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$totalAmount' },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ])
      .exec();

    // 5. Aggregation: Expenses (date)
    const expenseMatch = this.getDateMatch('date', start, end);
    const expenseAggregationPromise = this.expenseModel
      .aggregate([
        { $match: expenseMatch },
        {
          $facet: {
            byStatus: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$amount' },
                },
              },
            ],
            byType: [
              {
                $group: {
                  _id: '$type',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$amount' },
                },
              },
            ],
            byEmployee: [
              {
                $group: {
                  _id: '$employee',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$amount' },
                },
              },
            ],
          },
        },
      ])
      .exec();

    // 6. Aggregation: Incentives (createdAt)
    const incentiveMatch = this.getDateMatch('createdAt', start, end);
    const incentiveAggregationPromise = this.incentiveModel
      .aggregate([
        { $match: incentiveMatch },
        {
          $facet: {
            byStatus: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$incentiveAmount' },
                },
              },
            ],
            byEmployee: [
              {
                $group: {
                  _id: '$employeeId',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$incentiveAmount' },
                },
              },
            ],
            dateWise: [
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                  },
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$incentiveAmount' },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ])
      .exec();

    // 7. Aggregation: Pending Approvals (operational action backlog)
    const pendingOrdersPromise = this.orderModel
      .aggregate([
        { $match: { status: OrderStatus.PENDING } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ])
      .exec();

    const pendingExpensesPromise = this.expenseModel
      .aggregate([
        { $match: { status: ExpenseStatus.PENDING } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ])
      .exec();

    // Await all aggregations in parallel
    const [
      customerRes,
      visitRes,
      orderRes,
      expenseRes,
      incentiveRes,
      pendingOrdersRes,
      pendingExpensesRes,
    ] = await Promise.all([
      customerAggregationPromise,
      visitAggregationPromise,
      orderAggregationPromise,
      expenseAggregationPromise,
      incentiveAggregationPromise,
      pendingOrdersPromise,
      pendingExpensesPromise,
    ]);

    // Parse Customers
    const custFacet = customerRes[0] || {
      total: [],
      byStatus: [],
      byEmployee: [],
    };
    const totalCustomers = custFacet.total[0]?.count || 0;
    let activeCustomers = 0;
    let inactiveCustomers = 0;
    custFacet.byStatus.forEach((item: any) => {
      if (item._id === 'ACTIVE') activeCustomers = item.count;
      if (item._id === 'INACTIVE') inactiveCustomers = item.count;
    });

    const customersByEmpMap = new Map<string, number>();
    const customersByEmployee: EmployeeMetricDto[] = [];
    custFacet.byEmployee.forEach((item: any) => {
      if (item._id) {
        const empIdStr = item._id.toString();
        customersByEmpMap.set(empIdStr, item.count);
        const empInfo = employeeMap.get(empIdStr);
        if (empInfo) {
          customersByEmployee.push({
            employeeId: empIdStr,
            employeeName: empInfo.name,
            count: item.count,
          });
        }
      }
    });

    const customers: AdminCustomersDto = {
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      customersByEmployee,
    };

    // Parse Visits
    const visitFacet = visitRes[0] || { total: [], byEmployee: [], recent: [] };
    const totalVisits = visitFacet.total[0]?.count || 0;
    const visitsByEmpMap = new Map<string, number>();
    const visitsByEmployee: EmployeeMetricDto[] = [];
    visitFacet.byEmployee.forEach((item: any) => {
      if (item._id) {
        const empIdStr = item._id.toString();
        visitsByEmpMap.set(empIdStr, item.count);
        const empInfo = employeeMap.get(empIdStr);
        if (empInfo) {
          visitsByEmployee.push({
            employeeId: empIdStr,
            employeeName: empInfo.name,
            count: item.count,
          });
        }
      }
    });

    const recentVisits: AdminRecentVisitDto[] = (visitFacet.recent || []).map(
      (v: any) => ({
        id: v._id.toString(),
        customerName:
          v.customerDoc && v.customerDoc[0]
            ? v.customerDoc[0].customerName || v.customerDoc[0].businessName
            : 'Unknown Customer',
        employeeName:
          v.employeeDoc && v.employeeDoc[0]
            ? v.employeeDoc[0].name
            : 'Unknown Employee',
        visitDate: v.visitDate,
        purpose: v.purpose,
        result: v.result,
        followUpDate: v.followUpDate,
      }),
    );

    const visits: AdminVisitsDto = {
      totalVisits,
      visitsByEmployee,
      recentVisits,
    };

    // Parse Orders
    const orderFacet = orderRes[0] || {
      byStatus: [],
      byEmployee: [],
      dateWise: [],
    };
    let totalOrders = 0;
    let approvedOrders = 0;
    let completedOrders = 0;
    let pendingOrders = 0;
    let rejectedOrders = 0;
    let cancelledOrders = 0;
    let totalOrderValue = 0;
    let approvedOrderValue = 0;

    orderFacet.byStatus.forEach((item: any) => {
      const count = item.count || 0;
      const amount = item.totalAmount || 0;
      totalOrders += count;
      totalOrderValue += amount;

      if (item._id === OrderStatus.APPROVED) {
        approvedOrders = count;
        approvedOrderValue += amount;
      } else if (item._id === OrderStatus.COMPLETED) {
        completedOrders = count;
        approvedOrderValue += amount;
      } else if (item._id === OrderStatus.PENDING) {
        pendingOrders = count;
      } else if (item._id === OrderStatus.REJECTED) {
        rejectedOrders = count;
      } else if (item._id === OrderStatus.CANCELLED) {
        cancelledOrders = count;
      }
    });

    const ordersByEmpCountMap = new Map<string, number>();
    const ordersByEmpValueMap = new Map<string, number>();
    orderFacet.byEmployee.forEach((item: any) => {
      if (item._id) {
        const empIdStr = item._id.toString();
        ordersByEmpCountMap.set(empIdStr, item.count || 0);
        ordersByEmpValueMap.set(empIdStr, this.round(item.totalAmount || 0));
      }
    });

    const dateWiseOrderValue: DateWiseMetricDto[] = orderFacet.dateWise.map(
      (item: any) => ({
        date: item._id,
        count: item.count,
        totalAmount: this.round(item.totalAmount),
      }),
    );

    const orders: AdminOrdersDto = {
      totalOrders,
      approvedOrders,
      completedOrders,
      pendingOrders,
      rejectedOrders,
      cancelledOrders,
      totalOrderValue: this.round(totalOrderValue),
      approvedOrderValue: this.round(approvedOrderValue),
      dateWiseOrderValue,
    };

    // Parse Expenses
    const expenseFacet = expenseRes[0] || {
      byStatus: [],
      byType: [],
      byEmployee: [],
    };
    let totalExpenses = 0;
    let totalExpenseAmount = 0;
    let pendingExpenseCount = 0;
    let pendingExpenseAmount = 0;
    let approvedExpenseCount = 0;
    let approvedExpenseAmount = 0;
    let rejectedExpenseCount = 0;
    let rejectedExpenseAmount = 0;

    expenseFacet.byStatus.forEach((item: any) => {
      const count = item.count || 0;
      const amount = item.totalAmount || 0;
      totalExpenses += count;
      totalExpenseAmount += amount;

      if (item._id === ExpenseStatus.PENDING) {
        pendingExpenseCount = count;
        pendingExpenseAmount = amount;
      } else if (item._id === ExpenseStatus.APPROVED) {
        approvedExpenseCount = count;
        approvedExpenseAmount = amount;
      } else if (item._id === ExpenseStatus.REJECTED) {
        rejectedExpenseCount = count;
        rejectedExpenseAmount = amount;
      }
    });

    const expensesByType: ExpenseByTypeDto[] = Object.values(ExpenseType).map(
      (typeKey) => {
        const found = expenseFacet.byType.find((t: any) => t._id === typeKey);
        return {
          type: typeKey,
          count: found?.count || 0,
          totalAmount: this.round(found?.totalAmount || 0),
        };
      },
    );

    const expensesByEmpMap = new Map<string, number>();
    expenseFacet.byEmployee.forEach((item: any) => {
      if (item._id) {
        const empIdStr = item._id.toString();
        expensesByEmpMap.set(empIdStr, this.round(item.totalAmount || 0));
      }
    });

    const expenses: AdminExpensesDto = {
      totalExpenses,
      totalAmount: this.round(totalExpenseAmount),
      pendingCount: pendingExpenseCount,
      pendingAmount: this.round(pendingExpenseAmount),
      approvedCount: approvedExpenseCount,
      approvedAmount: this.round(approvedExpenseAmount),
      rejectedCount: rejectedExpenseCount,
      rejectedAmount: this.round(rejectedExpenseAmount),
      byType: expensesByType,
    };

    // Parse Incentives
    const incentiveFacet = incentiveRes[0] || {
      byStatus: [],
      byEmployee: [],
      dateWise: [],
    };
    let totalIncentives = 0;
    let totalIncentiveAmount = 0;
    let unpaidIncentiveCount = 0;
    let unpaidIncentiveAmount = 0;
    let paidIncentiveCount = 0;
    let paidIncentiveAmount = 0;

    incentiveFacet.byStatus.forEach((item: any) => {
      const count = item.count || 0;
      const amount = item.totalAmount || 0;
      totalIncentives += count;
      totalIncentiveAmount += amount;

      if (item._id === IncentiveStatus.UNPAID) {
        unpaidIncentiveCount = count;
        unpaidIncentiveAmount = amount;
      } else if (item._id === IncentiveStatus.PAID) {
        paidIncentiveCount = count;
        paidIncentiveAmount = amount;
      }
    });

    const incentivesByEmpMap = new Map<string, number>();
    incentiveFacet.byEmployee.forEach((item: any) => {
      if (item._id) {
        const empIdStr = item._id.toString();
        incentivesByEmpMap.set(empIdStr, this.round(item.totalAmount || 0));
      }
    });

    const dateWiseIncentives: DateWiseMetricDto[] = incentiveFacet.dateWise.map(
      (item: any) => ({
        date: item._id,
        count: item.count,
        totalAmount: this.round(item.totalAmount),
      }),
    );

    const incentives: AdminIncentivesDto = {
      totalIncentives,
      totalAmount: this.round(totalIncentiveAmount),
      unpaidCount: unpaidIncentiveCount,
      unpaidAmount: this.round(unpaidIncentiveAmount),
      paidCount: paidIncentiveCount,
      paidAmount: this.round(paidIncentiveAmount),
      dateWiseIncentives,
    };

    // Parse Pending Approvals
    const pendingApprovals: AdminPendingApprovalsDto = {
      pendingOrdersCount: pendingOrdersRes[0]?.count || 0,
      pendingOrdersAmount: this.round(pendingOrdersRes[0]?.totalAmount || 0),
      pendingExpensesCount: pendingExpensesRes[0]?.count || 0,
      pendingExpensesAmount: this.round(
        pendingExpensesRes[0]?.totalAmount || 0,
      ),
    };

    // Parse Summary
    const summary: AdminSummaryDto = {
      totalEmployees: activeEmployees.length,
      totalCustomers,
      totalVisits,
      totalOrders,
      totalOrderValue: this.round(totalOrderValue),
      totalExpenses: this.round(totalExpenseAmount),
      totalApprovedExpenseAmount: this.round(approvedExpenseAmount),
      totalPendingExpenseAmount: this.round(pendingExpenseAmount),
      totalIncentives: this.round(totalIncentiveAmount),
      totalPaidIncentives: this.round(paidIncentiveAmount),
      totalUnpaidIncentives: this.round(unpaidIncentiveAmount),
    };

    // Build Employee Performance Table
    const employeePerformance: EmployeePerformanceDto[] = activeEmployees.map(
      (emp) => {
        const empIdStr = emp._id.toString();
        return {
          employeeId: empIdStr,
          employeeName: emp.name,
          employeeEmail: emp.email,
          assignedCustomers: customersByEmpMap.get(empIdStr) || 0,
          visits: visitsByEmpMap.get(empIdStr) || 0,
          orders: ordersByEmpCountMap.get(empIdStr) || 0,
          orderValue: ordersByEmpValueMap.get(empIdStr) || 0,
          approvedIncentives: incentivesByEmpMap.get(empIdStr) || 0,
          totalExpenses: expensesByEmpMap.get(empIdStr) || 0,
        };
      },
    );

    return {
      summary,
      pendingApprovals,
      orders,
      expenses,
      incentives,
      visits,
      customers,
      employeePerformance,
    };
  }

  /**
   * Employee Dashboard: Strictly scoped to the authenticated employee
   */
  async getEmployeeDashboard(
    employeeId: string,
    query: QueryDashboardDto,
  ): Promise<EmployeeDashboardDto> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new NotFoundException('Invalid employee ID');
    }

    const empObjId = new Types.ObjectId(employeeId);
    const { start, end } = this.buildDateRange(query.startDate, query.endDate);

    // 1. Verify employee exists and is active
    const employee = await this.userModel.findById(empObjId).lean().exec();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // 2. Customers Aggregation for this Employee
    const customerAggregationPromise = this.customerModel
      .aggregate([
        { $match: { assignedEmployee: empObjId } },
        {
          $facet: {
            total: [{ $count: 'count' }],
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          },
        },
      ])
      .exec();

    // 3. Visits Aggregation for this Employee (visitDate)
    const visitDateMatch = this.getDateMatch('visitDate', start, end);
    const visitAggregationPromise = this.visitModel
      .aggregate([
        { $match: { employee: empObjId, ...visitDateMatch } },
        {
          $facet: {
            total: [{ $count: 'count' }],
            recent: [
              { $sort: { visitDate: -1 } },
              { $limit: 5 },
              {
                $lookup: {
                  from: 'customers',
                  localField: 'customer',
                  foreignField: '_id',
                  as: 'customerDoc',
                },
              },
            ],
          },
        },
      ])
      .exec();

    // 4. Orders Aggregation for this Employee (orderDate)
    const orderDateMatch = this.getDateMatch('orderDate', start, end);
    const orderAggregationPromise = this.orderModel
      .aggregate([
        { $match: { employee: empObjId, ...orderDateMatch } },
        {
          $facet: {
            byStatus: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$totalAmount' },
                },
              },
            ],
            recent: [
              { $sort: { orderDate: -1 } },
              { $limit: 5 },
              {
                $lookup: {
                  from: 'customers',
                  localField: 'customer',
                  foreignField: '_id',
                  as: 'customerDoc',
                },
              },
            ],
          },
        },
      ])
      .exec();

    // 5. Expenses Aggregation for this Employee (date)
    const expenseDateMatch = this.getDateMatch('date', start, end);
    const expenseAggregationPromise = this.expenseModel
      .aggregate([
        { $match: { employee: empObjId, ...expenseDateMatch } },
        {
          $facet: {
            byStatus: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$amount' },
                },
              },
            ],
            byType: [
              {
                $group: {
                  _id: '$type',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$amount' },
                },
              },
            ],
          },
        },
      ])
      .exec();

    // 6. Incentives Aggregation for this Employee (createdAt)
    const incentiveDateMatch = this.getDateMatch('createdAt', start, end);
    const incentiveAggregationPromise = this.incentiveModel
      .aggregate([
        { $match: { employeeId: empObjId, ...incentiveDateMatch } },
        {
          $facet: {
            byStatus: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$incentiveAmount' },
                },
              },
            ],
          },
        },
      ])
      .exec();

    // Await all aggregations in parallel
    const [customerRes, visitRes, orderRes, expenseRes, incentiveRes] =
      await Promise.all([
        customerAggregationPromise,
        visitAggregationPromise,
        orderAggregationPromise,
        expenseAggregationPromise,
        incentiveAggregationPromise,
      ]);

    // Parse Customers
    const custFacet = customerRes[0] || { total: [], byStatus: [] };
    const totalCustomers = custFacet.total[0]?.count || 0;
    let activeCustomers = 0;
    let inactiveCustomers = 0;
    custFacet.byStatus.forEach((item: any) => {
      if (item._id === 'ACTIVE') activeCustomers = item.count;
      if (item._id === 'INACTIVE') inactiveCustomers = item.count;
    });

    const customers: EmployeeCustomersDto = {
      total: totalCustomers,
      active: activeCustomers,
      inactive: inactiveCustomers,
    };

    // Parse Visits
    const visitFacet = visitRes[0] || { total: [], recent: [] };
    const totalVisits = visitFacet.total[0]?.count || 0;
    const recentVisits: EmployeeRecentVisitDto[] = (
      visitFacet.recent || []
    ).map((v: any) => ({
      id: v._id.toString(),
      customerName:
        v.customerDoc && v.customerDoc[0]
          ? v.customerDoc[0].customerName || v.customerDoc[0].businessName
          : 'Unknown Customer',
      visitDate: v.visitDate,
      purpose: v.purpose,
      result: v.result,
      followUpDate: v.followUpDate,
    }));

    const visits: EmployeeVisitsDto = {
      total: totalVisits,
      recent: recentVisits,
    };

    // Parse Orders
    const orderFacet = orderRes[0] || { byStatus: [], recent: [] };
    let totalOrders = 0;
    let pendingOrders = 0;
    let approvedOrders = 0;
    let completedOrders = 0;
    let rejectedOrders = 0;
    let cancelledOrders = 0;
    let totalOrderValue = 0;

    orderFacet.byStatus.forEach((item: any) => {
      const count = item.count || 0;
      const amount = item.totalAmount || 0;
      totalOrders += count;
      totalOrderValue += amount;

      if (item._id === OrderStatus.PENDING) pendingOrders = count;
      else if (item._id === OrderStatus.APPROVED) approvedOrders = count;
      else if (item._id === OrderStatus.COMPLETED) completedOrders = count;
      else if (item._id === OrderStatus.REJECTED) rejectedOrders = count;
      else if (item._id === OrderStatus.CANCELLED) cancelledOrders = count;
    });

    const recentOrders: EmployeeRecentOrderDto[] = (
      orderFacet.recent || []
    ).map((o: any) => ({
      id: o._id.toString(),
      customerName:
        o.customerDoc && o.customerDoc[0]
          ? o.customerDoc[0].customerName || o.customerDoc[0].businessName
          : 'Unknown Customer',
      orderDate: o.orderDate,
      totalAmount: this.round(o.totalAmount || 0),
      status: o.status,
      itemsCount: (o.items || []).length,
    }));

    const orders: EmployeeOrdersDto = {
      total: totalOrders,
      pending: pendingOrders,
      approved: approvedOrders,
      completed: completedOrders,
      rejected: rejectedOrders,
      cancelled: cancelledOrders,
      totalValue: this.round(totalOrderValue),
      recent: recentOrders,
    };

    // Parse Expenses
    const expenseFacet = expenseRes[0] || { byStatus: [], byType: [] };
    let totalExpenses = 0;
    let totalExpenseAmount = 0;
    let pendingExpenseCount = 0;
    let pendingExpenseAmount = 0;
    let approvedExpenseCount = 0;
    let approvedExpenseAmount = 0;
    let rejectedExpenseCount = 0;
    let rejectedExpenseAmount = 0;

    expenseFacet.byStatus.forEach((item: any) => {
      const count = item.count || 0;
      const amount = item.totalAmount || 0;
      totalExpenses += count;
      totalExpenseAmount += amount;

      if (item._id === ExpenseStatus.PENDING) {
        pendingExpenseCount = count;
        pendingExpenseAmount = amount;
      } else if (item._id === ExpenseStatus.APPROVED) {
        approvedExpenseCount = count;
        approvedExpenseAmount = amount;
      } else if (item._id === ExpenseStatus.REJECTED) {
        rejectedExpenseCount = count;
        rejectedExpenseAmount = amount;
      }
    });

    const expensesByType: ExpenseByTypeDto[] = Object.values(ExpenseType).map(
      (typeKey) => {
        const found = expenseFacet.byType.find((t: any) => t._id === typeKey);
        return {
          type: typeKey,
          count: found?.count || 0,
          totalAmount: this.round(found?.totalAmount || 0),
        };
      },
    );

    const expenses: EmployeeExpensesDto = {
      total: totalExpenses,
      totalAmount: this.round(totalExpenseAmount),
      pendingCount: pendingExpenseCount,
      pendingAmount: this.round(pendingExpenseAmount),
      approvedCount: approvedExpenseCount,
      approvedAmount: this.round(approvedExpenseAmount),
      rejectedCount: rejectedExpenseCount,
      rejectedAmount: this.round(rejectedExpenseAmount),
      byType: expensesByType,
    };

    // Parse Incentives
    const incentiveFacet = incentiveRes[0] || { byStatus: [] };
    let totalIncentives = 0;
    let totalIncentiveAmount = 0;
    let unpaidIncentiveCount = 0;
    let unpaidIncentiveAmount = 0;
    let paidIncentiveCount = 0;
    let paidIncentiveAmount = 0;

    incentiveFacet.byStatus.forEach((item: any) => {
      const count = item.count || 0;
      const amount = item.totalAmount || 0;
      totalIncentives += count;
      totalIncentiveAmount += amount;

      if (item._id === IncentiveStatus.UNPAID) {
        unpaidIncentiveCount = count;
        unpaidIncentiveAmount = amount;
      } else if (item._id === IncentiveStatus.PAID) {
        paidIncentiveCount = count;
        paidIncentiveAmount = amount;
      }
    });

    const incentives: EmployeeIncentivesDto = {
      total: totalIncentives,
      totalAmount: this.round(totalIncentiveAmount),
      unpaidCount: unpaidIncentiveCount,
      unpaidAmount: this.round(unpaidIncentiveAmount),
      paidCount: paidIncentiveCount,
      paidAmount: this.round(paidIncentiveAmount),
    };

    // Parse Summary
    const summary: EmployeeSummaryDto = {
      assignedCustomers: totalCustomers,
      totalVisits,
      totalOrders,
      totalOrderValue: this.round(totalOrderValue),
      pendingExpensesCount: pendingExpenseCount,
      pendingExpensesAmount: this.round(pendingExpenseAmount),
      approvedExpensesCount: approvedExpenseCount,
      approvedExpensesAmount: this.round(approvedExpenseAmount),
      pendingIncentivesCount: unpaidIncentiveCount,
      pendingIncentivesAmount: this.round(unpaidIncentiveAmount),
      paidIncentivesCount: paidIncentiveCount,
      paidIncentivesAmount: this.round(paidIncentiveAmount),
    };

    return {
      summary,
      customers,
      visits,
      orders,
      expenses,
      incentives,
    };
  }
}
