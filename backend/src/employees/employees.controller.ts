// User instruction: "Phase 3: Employee Management - Create EmployeesModule with employees.controller.ts"
// Importers/callers: employees.module.ts, main NestJS routing
// Affected API: /api/employees (GET, POST), /api/employees/:id (GET, PATCH), /api/employees/:id/status (PATCH)
// Data schemas: CreateEmployeeDto, UpdateEmployeeDto, UpdateStatusDto, QueryEmployeeDto

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { QueryEmployeeDto } from './dto/query-employee.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe.js';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  async findAll(@Query() query: QueryEmployeeDto) {
    return this.employeesService.findAll(query);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    if (
      user.role === UserRole.EMPLOYEE &&
      user._id.toString() !== id.toString()
    ) {
      throw new ForbiddenException('You can only access your own profile');
    }
    return this.employeesService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @CurrentUser() user: any,
  ) {
    if (
      user.role === UserRole.EMPLOYEE &&
      user._id.toString() !== id.toString()
    ) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.employeesService.update(id, updateEmployeeDto, user);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.employeesService.updateStatus(id, updateStatusDto);
  }
}
