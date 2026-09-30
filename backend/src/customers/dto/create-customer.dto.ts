// User instruction: "Phase 4: Customer Management - Create CreateCustomerDto for POST /customers"
// Importers/callers: customers.controller.ts, customers.service.ts
// Affected API: POST /customers (validates required fields: customerName, businessName, phone, address, assignedEmployee)
// Data schemas: CreateCustomerDto with class-validator decorators

import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'Customer name is required' })
  customerName: string;

  @IsString()
  @IsNotEmpty({ message: 'Business name is required' })
  businessName: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone is required' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  address: string;

  @IsMongoId({ message: 'Assigned employee must be a valid ID' })
  @IsNotEmpty({ message: 'Assigned employee is required' })
  assignedEmployee: string;
}
