// User instruction: "Phase 12: Enhance HealthController to check live MongoDB connection state using InjectConnection"
// Importers/callers: AppModule (backend/src/app.module.ts), load balancers, deployment probes, uptime monitors
// Affected API: GET /api/health
// Data schemas: HealthResponse ({ status: 'ok' | 'error', database: 'connected' | 'disconnected', timestamp: string, service: string })

import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from './auth/decorators/public.decorator.js';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get()
  check() {
    const isConnected = this.connection && this.connection.readyState === 1;

    if (!isConnected) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        service: 'lathikka-backend',
      });
    }

    return {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      service: 'lathikka-backend',
    };
  }
}

