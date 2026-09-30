import { registerAs } from '@nestjs/config';

// User instruction: "Fix only Phase 2 issues" - adding rate limiting for auth endpoints
// Imported by: app.module.ts for ThrottlerModule configuration
// Affects: POST /auth/login endpoint to prevent brute force attacks

export default registerAs('throttler', () => ({
  ttl: 60000, // 1 minute window
  limit: 5, // 5 requests per minute for auth endpoints
}));
