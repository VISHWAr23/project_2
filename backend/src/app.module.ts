import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import databaseConfig from './config/database.config.js';
import jwtConfig from './config/jwt.config.js';
import throttlerConfig from './config/throttler.config.js';
import { validationSchema } from './config/validation.schema.js';
import { HealthController } from './health.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { VisitsModule } from './visits/visits.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { IncentivesModule } from './incentives/incentives.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig, jwtConfig, throttlerConfig],
      validationSchema,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute (global default)
      },
    ]),

    // MongoDB connection
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/lathikka',
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    EmployeesModule,
    CustomersModule,
    VisitsModule,
    OrdersModule,
    IncentivesModule,
    ExpensesModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global guards - all routes protected by default
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
