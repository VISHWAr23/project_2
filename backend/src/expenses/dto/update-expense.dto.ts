// User instruction: "Phase 8: Expense Management - Create UpdateExpenseDto with optional date, type, amount, description, and receiptUrl"
// Importers/callers: backend/src/expenses/expenses.controller.ts, backend/src/expenses/expenses.service.ts
// Affected API: PATCH /api/expenses/:id
// Data schemas: UpdateExpenseDto, ExpenseType

import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseType } from '../schemas/expense.schema.js';

export class UpdateExpenseDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
