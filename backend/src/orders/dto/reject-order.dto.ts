// User instruction: "Phase 6: Order Management - Create RejectOrderDto"
// Importers/callers: orders.controller.ts, orders.service.ts
// Affected API: PATCH /orders/:id/reject
// Data schemas: RejectOrderDto

import { IsOptional, IsString } from 'class-validator';

export class RejectOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
