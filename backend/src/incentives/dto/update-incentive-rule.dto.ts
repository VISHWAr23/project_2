// User instruction: "Phase 7: Employee Incentive Management - Create UpdateIncentiveRuleDto"
// Importers/callers: backend/src/incentives/incentives.controller.ts, backend/src/incentives/incentives.service.ts
// Affected API: PATCH /api/incentives/rules
// Data schemas: UpdateIncentiveRuleDto (percentage)

import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateIncentiveRuleDto {
  @IsNumber({}, { message: 'Percentage must be a number' })
  @Min(0, { message: 'Percentage cannot be less than 0' })
  @Max(100, { message: 'Percentage cannot be greater than 100' })
  @Type(() => Number)
  percentage: number;
}
