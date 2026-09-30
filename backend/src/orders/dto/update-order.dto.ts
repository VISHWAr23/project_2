// User instruction: "Phase 6: Order Management - Create UpdateOrderDto"
// Importers/callers: orders.controller.ts, orders.service.ts
// Affected API: PATCH /orders/:id
// Data schemas: UpdateOrderDto, CreateOrderItemDto

import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order.dto.js';

export class UpdateOrderDto {
  @IsDate({ message: 'Invalid order date' })
  @IsOptional()
  @Type(() => Date)
  orderDate?: Date;

  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'Order must contain at least one item' })
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
