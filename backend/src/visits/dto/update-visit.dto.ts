// User instruction: "Phase 5: Customer Visit Management - Create UpdateVisitDto"
// Importers/callers: visits.controller.ts, visits.service.ts
// Affected API: PATCH /api/visits/:id
// Data schemas: UpdateVisitDto (visitDate, purpose, notes, result, followUpDate, photoUrl, latitude, longitude)

import {
  IsString,
  IsOptional,
  IsDate,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateVisitDto {
  @Type(() => Date)
  @IsDate({ message: 'Visit date must be a valid date' })
  @IsOptional()
  visitDate?: Date;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  result?: string;

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
