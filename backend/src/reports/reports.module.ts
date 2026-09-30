// User instruction: "Phase 10: Reports - Create ReportsModule registering models and providing ReportsService and ReportsController"
// Importers/callers: backend/src/app.module.ts
// Affected API: /api/reports/*
// Data schemas: User, Customer, Visit, Order, Expense, Incentive

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import {
  Customer,
  CustomerSchema,
} from '../customers/schemas/customer.schema.js';
import { Visit, VisitSchema } from '../visits/schemas/visit.schema.js';
import { Order, OrderSchema } from '../orders/schemas/order.schema.js';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema.js';
import {
  Incentive,
  IncentiveSchema,
} from '../incentives/schemas/incentive.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Visit.name, schema: VisitSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Incentive.name, schema: IncentiveSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
