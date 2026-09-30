// User instruction: "Phase 4: Customer Management - Create QueryCustomerDto for GET /customers with pagination and filters"
// Importers/callers: customers.controller.ts, customers.service.ts
// Affected API: GET /customers?page=1&limit=10&search=abc&status=ACTIVE&employeeId=xyz
// Data schemas: QueryCustomerDto validates query params (page, limit, search, status, employeeId)

import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsEnum,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerStatus } from '../schemas/customer.schema.js';

export class QueryCustomerDto {
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

  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;

  @IsMongoId({ message: 'Employee ID must be valid' })
  @IsOptional()
  employeeId?: string;
}
