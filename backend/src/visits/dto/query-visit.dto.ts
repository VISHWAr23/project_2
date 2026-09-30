// User instruction: "Phase 5: Customer Visit Management - Create QueryVisitDto"
// Importers/callers: visits.controller.ts, visits.service.ts
// Affected API: GET /api/visits
// Data schemas: QueryVisitDto (page, limit, employeeId, customerId, startDate, endDate)

import {
  IsInt,
  IsOptional,
  IsMongoId,
  IsDate,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryVisitDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @IsMongoId({ message: 'Employee ID must be a valid ID' })
  @IsOptional()
  employeeId?: string;

  @IsMongoId({ message: 'Customer ID must be a valid ID' })
  @IsOptional()
  customerId?: string;

  @Type(() => Date)
  @IsDate({ message: 'Start date must be a valid date' })
  @IsOptional()
  startDate?: Date;

  @Type(() => Date)
  @IsDate({ message: 'End date must be a valid date' })
  @IsOptional()
  endDate?: Date;
}
