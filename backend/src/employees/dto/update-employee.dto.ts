// User instruction: "Phase 3: Employee Management - Edit employee form: Name, Email, Phone"
// Importers/callers: employees.controller.ts, employees.service.ts
// Affected API: PATCH /api/employees/:id
// Data schema: UpdateEmployeeDto validated by global ValidationPipe

import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
