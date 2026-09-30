// User instruction: "Phase 4: Customer Management - Create UpdateCustomerDto for PATCH /customers/:id"
// Importers/callers: customers.controller.ts, customers.service.ts
// Affected API: PATCH /customers/:id (validates optional fields for partial updates)
// Data schemas: UpdateCustomerDto with optional fields (customerName, businessName, phone, address, assignedEmployee)

import { IsOptional, IsString, IsMongoId } from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsMongoId({ message: 'Assigned employee must be a valid ID' })
  @IsOptional()
  assignedEmployee?: string;
}
