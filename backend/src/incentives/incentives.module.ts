// User instruction: "Phase 7: Employee Incentive Management - Create IncentivesModule"
// Importers/callers: backend/src/app.module.ts, backend/src/orders/orders.module.ts
// Affected API: /api/incentives
// Data schemas: Incentive, IncentiveRule, IncentiveSchema, IncentiveRuleSchema

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IncentivesController } from './incentives.controller.js';
import { IncentivesService } from './incentives.service.js';
import { Incentive, IncentiveSchema } from './schemas/incentive.schema.js';
import {
  IncentiveRule,
  IncentiveRuleSchema,
} from './schemas/incentive-rule.schema.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Incentive.name, schema: IncentiveSchema },
      { name: IncentiveRule.name, schema: IncentiveRuleSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [IncentivesController],
  providers: [IncentivesService],
  exports: [IncentivesService],
})
export class IncentivesModule {}
