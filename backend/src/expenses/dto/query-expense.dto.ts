// User instruction: "Phase 8: Expense Management - Create QueryExpenseDto with pagination, status, type, employeeId, startDate, and endDate"
// Importers/callers: backend/src/expenses/expenses.controller.ts, backend/src/expenses/expenses.service.ts
// Affected API: GET /api/expenses
// Data schemas: QueryExpenseDto, ExpenseType, ExpenseStatus

import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseStatus, ExpenseType } from '../schemas/expense.schema.js';

export class QueryExpenseDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsMongoId()
  employeeId?: string;

  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
