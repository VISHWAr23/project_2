// User instruction: "Phase 5: Customer Visit Management - Create VisitsModule"
// Importers/callers: app.module.ts, customers.module.ts
// Affected API: /api/visits endpoints
// Data schemas: Visit, Customer, User Mongoose schemas and providers

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VisitsController } from './visits.controller.js';
import { VisitsService } from './visits.service.js';
import { Visit, VisitSchema } from './schemas/visit.schema.js';
import {
  Customer,
  CustomerSchema,
} from '../customers/schemas/customer.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { StorageService } from '../common/storage/storage.service.js';
import { CustomersModule } from '../customers/customers.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Visit.name, schema: VisitSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => CustomersModule),
  ],
  controllers: [VisitsController],
  providers: [VisitsService, StorageService],
  exports: [VisitsService, StorageService],
})
export class VisitsModule {}
