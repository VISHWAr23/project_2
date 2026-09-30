// User instruction: "Phase 6: Order Management - Create OrdersModule"
// Importers/callers: app.module.ts
// Affected API: /api/orders
// Data schemas: Order, Customer, User

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { Order, OrderSchema } from './schemas/order.schema.js';
import {
  Customer,
  CustomerSchema,
} from '../customers/schemas/customer.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { IncentivesModule } from '../incentives/incentives.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: User.name, schema: UserSchema },
    ]),
    IncentivesModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
