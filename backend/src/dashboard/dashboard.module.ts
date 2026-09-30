// User instruction: "Phase 9: Dashboard - Create DashboardModule registering schemas, service, and controller"
// Importers/callers: backend/src/app.module.ts
// Affected API: GET /api/dashboard/admin, GET /api/dashboard/employee
// Data schemas: User, Customer, Visit, Order, Incentive, Expense

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import {
  Customer,
  CustomerSchema,
} from '../customers/schemas/customer.schema.js';
import { Visit, VisitSchema } from '../visits/schemas/visit.schema.js';
import { Order, OrderSchema } from '../orders/schemas/order.schema.js';
import {
  Incentive,
  IncentiveSchema,
} from '../incentives/schemas/incentive.schema.js';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Visit.name, schema: VisitSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Incentive.name, schema: IncentiveSchema },
      { name: Expense.name, schema: ExpenseSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
