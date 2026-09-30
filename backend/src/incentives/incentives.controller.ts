// User instruction: "Phase 7: Employee Incentive Management - Create IncentivesController"
// Importers/callers: backend/src/incentives/incentives.module.ts, backend/src/app.module.ts
// Affected API: /api/incentives (GET /rules/active, PATCH /rules, GET /, GET /order/:orderId, GET /:id, PATCH /:id/pay)
// Data schemas: Incentive, IncentiveRule, UpdateIncentiveRuleDto, QueryIncentiveDto, User

import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IncentivesService } from './incentives.service.js';
import { UpdateIncentiveRuleDto } from './dto/update-incentive-rule.dto.js';
import { QueryIncentiveDto } from './dto/query-incentive.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe.js';

@Controller('incentives')
export class IncentivesController {
  constructor(private readonly incentivesService: IncentivesService) {}

  /**
   * GET /api/incentives/rules/active
   * Retrieves current active incentive percentage rule (ADMIN only).
   */
  @Get('rules/active')
  @Roles(UserRole.ADMIN)
  async getActiveRule() {
    return this.incentivesService.getActiveRule();
  }

  /**
   * PATCH /api/incentives/rules
   * Updates current active incentive rule percentage (ADMIN only).
   */
  @Patch('rules')
  @Roles(UserRole.ADMIN)
  async updateActiveRule(
    @Body() updateDto: UpdateIncentiveRuleDto,
    @CurrentUser() user: any,
  ) {
    return this.incentivesService.updateActiveRule(updateDto, user);
  }

  /**
   * GET /api/incentives
   * Lists incentives with role-scoped filtering and metrics.
   * ADMIN sees all, EMPLOYEE sees only their own.
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async findAll(@Query() query: QueryIncentiveDto, @CurrentUser() user: any) {
    return this.incentivesService.findAll(query, user);
  }

  /**
   * GET /api/incentives/order/:orderId
   * Retrieves incentive for a specific order.
   */
  @Get('order/:orderId')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async findByOrderId(
    @Param('orderId', ParseMongoIdPipe) orderId: string,
    @CurrentUser() user: any,
  ) {
    return this.incentivesService.findByOrderId(orderId, user);
  }

  /**
   * GET /api/incentives/:id
   * Retrieves single incentive by ID with RBAC ownership check.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async findById(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.incentivesService.findById(id, user);
  }

  /**
   * PATCH /api/incentives/:id/pay
   * Marks an UNPAID incentive as PAID (ADMIN only).
   */
  @Patch(':id/pay')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async markAsPaid(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.incentivesService.markAsPaid(id, user);
  }
}
