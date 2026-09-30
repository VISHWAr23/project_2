// User instruction: "Phase 8: Expense Management - Create RejectExpenseDto with mandatory rejection reason string"
// Importers/callers: backend/src/expenses/expenses.controller.ts, backend/src/expenses/expenses.service.ts
// Affected API: PATCH /api/expenses/:id/reject
// Data schemas: RejectExpenseDto

import { IsNotEmpty, IsString } from 'class-validator';

export class RejectExpenseDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}
