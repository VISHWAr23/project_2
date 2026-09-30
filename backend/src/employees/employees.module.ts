// User instruction: "Phase 3: Employee Management - Create EmployeesModule with employees.module.ts"
// Importers/callers: app.module.ts
// Affected API: /api/employees routes
// Data schemas: User, UserSchema

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
