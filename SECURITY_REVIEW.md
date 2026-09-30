# Phase 2 Security Review — 2026-09-27

User requested: "perform a security and architecture review of Phase 2" focusing on JWT, password hashing, password leakage, role guards, inactive users, protected routes, CORS, validation, MongoDB indexes, frontend auth, token storage, unauthorized/forbidden access.

Affected: `backend/src/auth/*`, `backend/src/users/*`, `frontend/src/providers/auth-provider.tsx`, `frontend/src/lib/api-client.ts`, user schema, JWT strategy, auth service, guards.

## Summary
**Status:** 8 issues found (3 HIGH, 3 MEDIUM, 2 LOW)

## Issues Found

### 🔴 HIGH Severity

#### 1. Missing MongoDB Indexes on Critical Fields
**Location:** `backend/src/users/schemas/user.schema.ts`

**Issue:** No database indexes defined. The `email` field has `unique: true` but this creates an index only in Mongoose, not guaranteed in MongoDB. Missing indexes on frequently queried fields (`email`, `isActive`, `role`) causes performance degradation and enables timing attacks.

**Impact:**
- Slow login queries at scale
- Timing attacks can enumerate valid emails
- Admin queries filtering by role are O(n)

**Fix:** Add explicit compound indexes for common query patterns.

---

#### 2. Weak Bcrypt Salt Rounds
**Location:** `backend/src/users/users.service.ts:18`

**Issue:** Using `bcrypt.hash(password, 10)` — only 10 rounds is below current OWASP recommendation of 12+ rounds for 2026.

**Impact:** Passwords are ~4x faster to crack than they should be.

**Fix:** Increase to 12 rounds minimum.

---

#### 3. No Refresh Token Implementation
**Location:** `backend/src/auth/*`

**Issue:** System design specifies Access + Refresh JWT rotation (15m access, 7d refresh), but only access tokens are implemented. No refresh endpoint, no token rotation, no revocation mechanism.

**Impact:**
- Users must re-login every 15 minutes (terrible UX)
- OR access token expiration must be extended to hours/days (security risk)
- No way to revoke sessions without changing JWT secret globally

**Fix:** Implement refresh token flow with storage, rotation, and revocation.

---

### 🟡 MEDIUM Severity

#### 4. Frontend Token Storage in Cookies Without Security Flags
**Location:** `frontend/src/providers/auth-provider.tsx:56`

**Issue:** `Cookies.set('auth_token', data.accessToken, { expires: 7 })` has no `secure`, `httpOnly`, or `sameSite` flags.

**Impact:**
- Token accessible via JavaScript (XSS risk)
- Token sent over HTTP in development
- CSRF attacks possible

**Fix:** Use `httpOnly` cookies set by backend, or add security flags on frontend.

---

#### 5. Password Hash Exposure Risk in User Service
**Location:** `backend/src/users/users.service.ts:29`

**Issue:** `findByEmail` explicitly selects `+passwordHash`. While this is intentional for login validation, there's no corresponding method that excludes it, increasing risk of accidental exposure in other query paths.

**Impact:** Any future code calling `findByEmail` outside auth context gets the password hash.

**Fix:** Create separate `findByEmailForAuth` method that explicitly selects hash, keep default `findByEmail` without it.

---

#### 6. No Rate Limiting on Login Endpoint
**Location:** `backend/src/auth/auth.controller.ts:12`

**Issue:** No rate limiting on `/auth/login`. Allows unlimited login attempts.

**Impact:**
- Brute force attacks on user passwords
- Account enumeration via timing
- DoS via repeated auth attempts

**Fix:** Add rate limiting (e.g., `@nestjs/throttler`) to auth endpoints.

---

### 🟢 LOW Severity

#### 7. Generic Error Messages Could Be More Specific for Ops
**Location:** `backend/src/auth/auth.service.ts:19,31`

**Issue:** Login returns same message for "user not found" and "invalid password" (correct for security), but also same message for "inactive account". Ops teams can't distinguish between security blocks and account state issues in logs.

**Impact:** Harder to debug customer support tickets.

**Fix:** Keep user-facing message generic, but log detailed failure reason server-side.

---

#### 8. CORS Origin from Environment Variable Without Validation
**Location:** `backend/src/main.ts:12`

**Issue:** `process.env.CORS_ORIGIN || 'http://localhost:3000'` trusts env var without validation. Misconfiguration could allow any origin.

**Impact:** Misconfigured CORS in production could expose API to unauthorized origins.

**Fix:** Validate CORS_ORIGIN format or use allowlist.

---

## ✅ Secure Practices Found

1. **Password hashing with bcrypt + salt** ✓
2. **Password field marked `select: false`** ✓
3. **toJSON transform strips passwordHash** ✓
4. **JWT validation with expiration checks** ✓
5. **Inactive user checks in strategy** ✓
6. **Global JWT + Roles guards** ✓
7. **@Public() decorator for unauthenticated routes** ✓
8. **ValidationPipe with whitelist + forbidNonWhitelisted** ✓
9. **Input validation with class-validator** ✓
10. **CORS with credentials: true** ✓
11. **JWT secrets required to be 32+ chars** ✓
12. **Authorization header Bearer token extraction** ✓

---

## Phase 2 Scope Confirmation
✅ No Phase 3 code found (orders, expenses, incentives modules not implemented)
✅ Only reviewing: Auth, Users, Customers (Phase 2)
✅ Customers/Visits modules not yet created

---

## Recommendations Priority

**Must fix before production:**
- #1 MongoDB indexes
- #2 Bcrypt rounds
- #3 Refresh token implementation
- #4 Cookie security flags
- #6 Rate limiting

**Should fix soon:**
- #5 Password hash exposure risk

**Nice to have:**
- #7 Detailed logging
- #8 CORS validation
