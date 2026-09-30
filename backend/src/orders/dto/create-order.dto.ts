// User instruction: "Phase 6: Order Management - Create CreateOrderDto with OrderItem DTO"
// Importers/callers: orders.controller.ts, orders.service.ts
// Affected API: POST /orders
// Data schemas: CreateOrderDto, CreateOrderItemDto

import {
  IsMongoId,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  @Type(() => Number)
  quantity: number;

  @IsNumber()
  @Min(0, { message: 'Unit price cannot be negative' })
  @Type(() => Number)
  unitPrice: number;
}

export class CreateOrderDto {
  @IsMongoId({ message: 'Invalid customer ID' })
  @IsNotEmpty({ message: 'Customer is required' })
  customer: string;

  @IsMongoId({ message: 'Invalid employee ID' })
  @IsOptional()
  employee?: string;

  @IsDate({ message: 'Invalid order date' })
  @IsOptional()
  @Type(() => Date)
  orderDate?: Date;

  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'Order must contain at least one item' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
