// User instruction: "Phase 12: Write unit tests for HealthController verifying 200 OK when database is connected and 503 ServiceUnavailableException when disconnected"
// Importers/callers: Vitest test runner
// Affected API: GET /api/health
// Data schemas: HealthResponse ({ status: 'ok' | 'error', database: 'connected' | 'disconnected', timestamp: string, service: string })

import { describe, it, expect } from 'vitest';
import { HealthController } from './health.controller.js';
import { ServiceUnavailableException } from '@nestjs/common';
import type { Connection } from 'mongoose';

describe('HealthController', () => {
  it('1. should return 200 OK with database: connected when readyState is 1', () => {
    const mockConnection = {
      readyState: 1,
    } as unknown as Connection;

    const controller = new HealthController(mockConnection);
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.service).toBe('lathikka-backend');
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });

  it('2. should throw ServiceUnavailableException (503) when database readyState is not 1', () => {
    const mockConnection = {
      readyState: 0, // Disconnected
    } as unknown as Connection;

    const controller = new HealthController(mockConnection);

    expect(() => controller.check()).toThrow(ServiceUnavailableException);

    try {
      controller.check();
    } catch (error: any) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      const response = error.getResponse();
      expect(response.status).toBe('error');
      expect(response.database).toBe('disconnected');
      expect(response.service).toBe('lathikka-backend');
      expect(response.timestamp).toBeDefined();
    }
  });

  it('3. should throw ServiceUnavailableException when connection is undefined/null', () => {
    const controller = new HealthController(null as unknown as Connection);

    expect(() => controller.check()).toThrow(ServiceUnavailableException);
  });
});
