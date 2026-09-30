// User instruction: "Phase 3: Employee Management - LIST EMPLOYEES: GET /employees with pagination, search by name/email, active/inactive filtering"
// Importers/callers: employees.controller.ts, employees.service.ts
// Affected API: GET /api/employees
// Data schema: QueryEmployeeDto validated and transformed by global ValidationPipe

import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryEmployeeDto {
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

  @IsString()
  @IsOptional()
  search?: string;

  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
