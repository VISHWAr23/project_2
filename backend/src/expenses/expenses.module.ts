// User instruction: "Phase 8: Expense Management - Create ExpensesModule registering schemas, controller, and providers"
// Importers/callers: backend/src/app.module.ts
// Affected API: /api/expenses
// Data schemas: Expense, ExpenseSchema, User, UserSchema

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';
import { Expense, ExpenseSchema } from './schemas/expense.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { StorageService } from '../common/storage/storage.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService, StorageService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
