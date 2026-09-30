// User instruction: "Phase 8: Expense Management - Create CreateExpenseDto with date, type, amount, description, receiptUrl, and optional employee"
// Importers/callers: backend/src/expenses/expenses.controller.ts, backend/src/expenses/expenses.service.ts
// Affected API: POST /api/expenses
// Data schemas: CreateExpenseDto, ExpenseType

import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseType } from '../schemas/expense.schema.js';

export class CreateExpenseDto {
  @IsOptional()
  @IsMongoId()
  employee?: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsEnum(ExpenseType)
  type: ExpenseType;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
