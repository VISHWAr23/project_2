// User instruction: "Phase 3: Employee Management - Create employee form: Name, Email, Phone, Password"
// Importers/callers: employees.controller.ts, employees.service.ts
// Affected API: POST /api/employees
// Data schema: CreateEmployeeDto validated by global ValidationPipe

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}
