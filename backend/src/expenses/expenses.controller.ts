// User instruction: "Phase 8: Expense Management - Create ExpensesController with RBAC routes, validation pipes, and receipt file upload endpoint"
// Importers/callers: backend/src/expenses/expenses.module.ts, backend/src/expenses/expenses.controller.spec.ts
// Affected API: /api/expenses (GET /, GET /:id, POST /, PATCH /:id, PATCH /:id/approve, PATCH /:id/reject, POST /upload)
// Data schemas: CreateExpenseDto, UpdateExpenseDto, QueryExpenseDto, RejectExpenseDto

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExpensesService } from './expenses.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { QueryExpenseDto } from './dto/query-expense.dto.js';
import { RejectExpenseDto } from './dto/reject-expense.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe.js';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  async findAll(@Query() query: QueryExpenseDto, @CurrentUser() user: any) {
    return this.expensesService.findAll(query, user);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.findById(id, user);
  }

  @Post()
  async create(
    @Body() createExpenseDto: CreateExpenseDto,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.create(createExpenseDto, user);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.update(id, updateExpenseDto, user);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  async approve(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.approve(id, user);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN)
  async reject(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() rejectExpenseDto: RejectExpenseDto,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.reject(id, rejectExpenseDto, user);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadReceipt(
    @UploadedFile()
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    return this.expensesService.uploadReceipt(file);
  }
}
