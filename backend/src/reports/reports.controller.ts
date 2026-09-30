// User instruction: "Phase 10: Reports - Create ReportsController with RBAC-protected endpoints for all 7 reporting dimensions"
// Importers/callers: backend/src/reports/reports.module.ts, backend/src/reports/reports.controller.spec.ts
// Affected API: /api/reports/visits/employees, /api/reports/orders/employees, /api/reports/sales/employees, /api/reports/expenses/employees, /api/reports/incentives/employees, /api/reports/customers/:customerId/visits, /api/reports/date-wise
// Data schemas: QueryReportsDto, QueryCustomerVisitsDto, EmployeeVisitReportDto, EmployeeOrderReportDto, EmployeeSalesReportDto, EmployeeExpenseReportDto, EmployeeIncentiveReportDto, CustomerVisitHistoryDto, DateWiseReportDto

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../users/schemas/user.schema.js';
import {
  QueryCustomerVisitsDto,
  QueryReportsDto,
} from './dto/query-reports.dto.js';
import {
  CustomerVisitHistoryDto,
  DateWiseReportDto,
  EmployeeExpenseReportDto,
  EmployeeIncentiveReportDto,
  EmployeeOrderReportDto,
  EmployeeSalesReportDto,
  EmployeeVisitReportDto,
} from './dto/report-responses.dto.js';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /api/reports/visits/employees
   * Employee-wise visit counts
   */
  @Get('visits/employees')
  async getEmployeeVisits(
    @Query() query: QueryReportsDto,
    @CurrentUser() user: any,
  ): Promise<EmployeeVisitReportDto[]> {
    return this.reportsService.getEmployeeVisits(query, user);
  }

  /**
   * GET /api/reports/orders/employees
   * Employee-wise order counts by status
   */
  @Get('orders/employees')
  async getEmployeeOrders(
    @Query() query: QueryReportsDto,
    @CurrentUser() user: any,
  ): Promise<EmployeeOrderReportDto[]> {
    return this.reportsService.getEmployeeOrders(query, user);
  }

  /**
   * GET /api/reports/sales/employees
   * Employee-wise order value / sales report
   */
  @Get('sales/employees')
  async getEmployeeSales(
    @Query() query: QueryReportsDto,
    @CurrentUser() user: any,
  ): Promise<EmployeeSalesReportDto[]> {
    return this.reportsService.getEmployeeSales(query, user);
  }

  /**
   * GET /api/reports/expenses/employees
   * Employee-wise expenses breakdown
   */
  @Get('expenses/employees')
  async getEmployeeExpenses(
    @Query() query: QueryReportsDto,
    @CurrentUser() user: any,
  ): Promise<EmployeeExpenseReportDto[]> {
    return this.reportsService.getEmployeeExpenses(query, user);
  }

  /**
   * GET /api/reports/incentives/employees
   * Employee-wise incentive amounts
   */
  @Get('incentives/employees')
  async getEmployeeIncentives(
    @Query() query: QueryReportsDto,
    @CurrentUser() user: any,
  ): Promise<EmployeeIncentiveReportDto[]> {
    return this.reportsService.getEmployeeIncentives(query, user);
  }

  /**
   * GET /api/reports/customers/:customerId/visits
   * Customer visit history chronologically
   */
  @Get('customers/:customerId/visits')
  async getCustomerVisitHistory(
    @Param('customerId') customerId: string,
    @Query() query: QueryCustomerVisitsDto,
    @CurrentUser() user: any,
  ): Promise<CustomerVisitHistoryDto> {
    return this.reportsService.getCustomerVisitHistory(customerId, query, user);
  }

  /**
   * GET /api/reports/date-wise
   * Daily aggregated operational metrics
   */
  @Get('date-wise')
  async getDateWiseReport(
    @Query() query: QueryReportsDto,
    @CurrentUser() user: any,
  ): Promise<DateWiseReportDto[]> {
    return this.reportsService.getDateWiseReport(query, user);
  }
}
