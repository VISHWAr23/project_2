// User instruction: "Phase 6: Order Management - Create QueryOrderDto"
// Importers/callers: orders.controller.ts, orders.service.ts
// Affected API: GET /orders
// Data schemas: QueryOrderDto, OrderStatus

import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsMongoId,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../schemas/order.schema.js';

export class QueryOrderDto {
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
  @IsMongoId({ message: 'Invalid employee ID' })
  employeeId?: string;

  @IsOptional()
  @IsMongoId({ message: 'Invalid customer ID' })
  customerId?: string;

  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Invalid order status' })
  status?: OrderStatus;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid start date format' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid end date format' })
  endDate?: string;
}
