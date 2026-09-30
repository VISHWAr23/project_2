// User instruction: "Phase 9: Dashboard - Create QueryDashboardDto with optional startDate and endDate"
// Importers/callers: backend/src/dashboard/dashboard.controller.ts, backend/src/dashboard/dashboard.service.ts
// Affected API: GET /api/dashboard/admin, GET /api/dashboard/employee
// Data schemas: QueryDashboardDto (startDate, endDate)

import { IsDateString, IsOptional } from 'class-validator';

export class QueryDashboardDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
