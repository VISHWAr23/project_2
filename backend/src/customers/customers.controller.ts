// User instruction: "Phase 4 & Phase 5: Customer Management & Customer Visits - Create CustomersController with full RBAC enforcement"
// Importers/callers: customers.module.ts
// Affected API: /api/customers endpoints (GET, POST, PATCH with role-based access control), /api/customers/:customerId/visits
// Data schemas: Customer, Visit, CreateCustomerDto, UpdateCustomerDto, UpdateStatusDto, QueryCustomerDto

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { VisitsService } from '../visits/visits.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { QueryCustomerDto } from './dto/query-customer.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe.js';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly visitsService: VisitsService,
  ) {}

  @Get()
  async findAll(@Query() query: QueryCustomerDto, @CurrentUser() user: any) {
    return this.customersService.findAll(query, user);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.customersService.findById(id, user);
  }

  @Get(':customerId/visits')
  async findVisits(
    @Param('customerId', ParseMongoIdPipe) customerId: string,
    @CurrentUser() user: any,
  ) {
    return this.visitsService.findByCustomer(customerId, user);
  }

  @Post()
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: any,
  ) {
    return this.customersService.create(createCustomerDto, user);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: any,
  ) {
    return this.customersService.update(id, updateCustomerDto, user);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.customersService.updateStatus(id, updateStatusDto);
  }
}
