// User instruction: "Phase 7: Employee Incentive Management - Create QueryIncentiveDto"
// Importers/callers: backend/src/incentives/incentives.controller.ts, backend/src/incentives/incentives.service.ts
// Affected API: GET /api/incentives
// Data schemas: QueryIncentiveDto

import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsString,
  IsDateString,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IncentiveStatus } from '../schemas/incentive.schema.js';

export class QueryIncentiveDto {
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
  @IsMongoId({ message: 'Invalid employeeId format' })
  employeeId?: string;

  @IsOptional()
  @IsMongoId({ message: 'Invalid orderId format' })
  orderId?: string;

  @IsOptional()
  @IsEnum(IncentiveStatus, {
    message: 'Status must be one of: UNPAID, PAID',
  })
  status?: IncentiveStatus;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid startDate format' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid endDate format' })
  endDate?: string;
}
