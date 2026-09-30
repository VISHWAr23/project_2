// User instruction: "Phase 4: Customer Management - Create UpdateStatusDto for PATCH /customers/:id/status"
// Importers/callers: customers.controller.ts, customers.service.ts
// Affected API: PATCH /customers/:id/status (ADMIN-only endpoint to activate/deactivate customers)
// Data schemas: UpdateStatusDto validates status enum (ACTIVE/INACTIVE)

import { IsEnum, IsNotEmpty } from 'class-validator';
import { CustomerStatus } from '../schemas/customer.schema.js';

export class UpdateStatusDto {
  @IsEnum(CustomerStatus, { message: 'Status must be ACTIVE or INACTIVE' })
  @IsNotEmpty({ message: 'Status is required' })
  status: CustomerStatus;
}
