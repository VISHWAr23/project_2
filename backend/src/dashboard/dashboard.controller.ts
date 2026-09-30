// User instruction: "Phase 9: Dashboard - Create DashboardController with role-based admin and employee endpoints"
// Importers/callers: backend/src/dashboard/dashboard.module.ts, backend/src/dashboard/dashboard.controller.spec.ts
// Affected API: GET /api/dashboard/admin, GET /api/dashboard/employee
// Data schemas: AdminDashboardDto, EmployeeDashboardDto, QueryDashboardDto

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { QueryDashboardDto } from './dto/query-dashboard.dto.js';
import { AdminDashboardDto } from './dto/admin-dashboard.dto.js';
import { EmployeeDashboardDto } from './dto/employee-dashboard.dto.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /api/dashboard/admin
   * Aggregated operational metrics for administrators
   */
  @Get('admin')
  @Roles(UserRole.ADMIN)
  async getAdminDashboard(
    @Query() query: QueryDashboardDto,
  ): Promise<AdminDashboardDto> {
    return this.dashboardService.getAdminDashboard(query);
  }

  /**
   * GET /api/dashboard/employee
   * Strictly scoped to the authenticated employee
   */
  @Get('employee')
  @Roles(UserRole.EMPLOYEE, UserRole.ADMIN)
  async getEmployeeDashboard(
    @CurrentUser() user: any,
    @Query() query: QueryDashboardDto,
  ): Promise<EmployeeDashboardDto> {
    const employeeId = user?.userId || user?.sub || user?._id?.toString();
    return this.dashboardService.getEmployeeDashboard(employeeId, query);
  }
}
