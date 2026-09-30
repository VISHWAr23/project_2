// User instruction: "Phase 4: Customer Management - Create CustomersModule"
// Importers/callers: app.module.ts
// Affected API: Registers CustomersController and CustomersService, imports Customer and User schemas
// Data schemas: Customer, User

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { Customer, CustomerSchema } from './schemas/customer.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { VisitsModule } from '../visits/visits.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => VisitsModule),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
