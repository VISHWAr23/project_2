// User instruction: "Perform one final verification pass focused only on missing evidence and unresolved issues."
// Importers/callers: vitest.config.e2e.ts, vitest e2e runner
// Affected API: E2E test suite / HealthController
// Data schemas: INestApplication

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
