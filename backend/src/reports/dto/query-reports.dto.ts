// User instruction: "Phase 10: Reports - Create query DTO for report filters"
// Importers/callers: backend/src/reports/reports.controller.ts, backend/src/reports/reports.service.ts
// Affected API: /api/reports/* endpoints
// Data schemas: QueryReportsDto, QueryCustomerVisitsDto

import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { ExpenseType } from '../../expenses/schemas/expense.schema.js';
import { IncentiveStatus } from '../../incentives/schemas/incentive.schema.js';

export class QueryReportsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsMongoId()
  employeeId?: string;

  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @IsOptional()
  @IsEnum(IncentiveStatus)
  paymentStatus?: IncentiveStatus;
}

export class QueryCustomerVisitsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
