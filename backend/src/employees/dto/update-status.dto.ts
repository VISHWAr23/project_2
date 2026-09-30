// User instruction: "Phase 3: Employee Management - STATUS: PATCH /employees/:id/status"
// Importers/callers: employees.controller.ts, employees.service.ts
// Affected API: PATCH /api/employees/:id/status
// Data schema: UpdateStatusDto validated by global ValidationPipe

import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateStatusDto {
  @IsBoolean({ message: 'isActive must be a boolean' })
  @IsNotEmpty({ message: 'isActive status is required' })
  isActive: boolean;
}
