// User instruction: "Phase 5: Customer Visit Management - Create CreateVisitDto"
// Importers/callers: visits.controller.ts, visits.service.ts
// Affected API: POST /api/visits
// Data schemas: CreateVisitDto (customer, employee, visitDate, purpose, notes, result, followUpDate, photoUrl, latitude, longitude)

import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsOptional,
  IsDate,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVisitDto {
  @IsMongoId({ message: 'Customer ID must be a valid ID' })
  @IsNotEmpty({ message: 'Customer is required' })
  customer: string;

  @IsMongoId({ message: 'Employee ID must be a valid ID' })
  @IsOptional()
  employee?: string;

  @Type(() => Date)
  @IsDate({ message: 'Visit date must be a valid date' })
  @IsNotEmpty({ message: 'Visit date is required' })
  visitDate: Date;

  @IsString()
  @IsNotEmpty({ message: 'Purpose is required' })
  purpose: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsNotEmpty({ message: 'Result is required' })
  result: string;

  @Type(() => Date)
  @IsDate({ message: 'Follow-up date must be a valid date' })
  @IsOptional()
  followUpDate?: Date;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude must be a number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  @IsOptional()
  latitude?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude must be a number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  @IsOptional()
  longitude?: number;
}
