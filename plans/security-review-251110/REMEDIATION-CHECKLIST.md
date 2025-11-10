# Security Remediation Checklist

**Project:** DXUP
**Date:** 2025-11-10
**Version:** 3.36.2

---

## 🔴 CRITICAL - Deploy within 24-48 Hours

### ✅ Task 1: Encrypt Sensitive Credentials at Rest

**Assignee:** _____________
**Due Date:** 2025-11-12
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Done

**Files to Modify:**
- [ ] `/src/entities/Cluster.ts`
- [ ] `/src/entities/ContainerRegistry.ts`
- [ ] `/src/services/ClusterService.ts`
- [ ] `/src/services/ContainerRegistryService.ts`

**Implementation Steps:**
1. [ ] Create `src/plugins/encryption.ts` with AES-256-GCM utilities
2. [ ] Add `ENCRYPTION_KEY` to environment variables (.env.example)
3. [ ] Update entity schemas to store encrypted objects `{ encrypted, iv, tag }`
4. [ ] Modify service layer to encrypt on create/update
5. [ ] Modify service layer to decrypt on read
6. [ ] Write migration script for existing data
7. [ ] Test encryption/decryption flow
8. [ ] Update documentation

**Test Cases:**
- [ ] Encrypt new cluster creation
- [ ] Decrypt on cluster retrieval
- [ ] Migrate existing clusters
- [ ] Verify encrypted data in MongoDB

**Dependencies:**
```bash
# No new dependencies needed (use Node crypto)
```

**Definition of Done:**
- All kubeConfig, serviceAccount, apiAccessToken fields encrypted
- Existing data migrated
- Tests passing
- Documentation updated

---

### ✅ Task 2: Fix NoSQL Injection Vulnerability

**Assignee:** _____________
**Due Date:** 2025-11-12
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Done

**Files to Modify:**
- [ ] `/src/plugins/parse-request-filter.ts`

**Implementation Steps:**
1. [ ] Create query sanitization function
2. [ ] Whitelist allowed operators: `$eq, $ne, $gt, $gte, $lt, $lte, $in, $nin`
3. [ ] Block dangerous operators: `$where, $regex, $expr, $function`
4. [ ] Limit `$or`/`$and` complexity (max 10 conditions)
5. [ ] Add validation for array structures
6. [ ] Integrate sanitization in `parseRequestFilter()`
7. [ ] Test with attack payloads
8. [ ] Update API documentation

**Test Cases:**
- [ ] Block `?or[0][password][$ne]=null`
- [ ] Block `?email[$regex]=.*`
- [ ] Block `?and[0][$where]=...`
- [ ] Allow `?status[$in][]=active&status[$in][]=pending`
- [ ] Limit `$or` to 10 conditions

**Attack Vectors to Test:**
```bash
# Should be BLOCKED
GET /api/v1/users?or[0][password][$ne]=null
GET /api/v1/users?email[$regex]=.*
GET /api/v1/clusters?kubeConfig[$exists]=true
GET /api/v1/users?$where=this.password==null

# Should be ALLOWED
GET /api/v1/users?status[$eq]=active
GET /api/v1/users?createdAt[$gte]=2024-01-01
```

**Definition of Done:**
- All dangerous operators blocked
- Whitelisted operators work correctly
- Attack payloads return errors
- Tests passing
- Security advisory published

---

### ✅ Task 3: Remove Hardcoded Database Wipe Password

**Assignee:** _____________
**Due Date:** 2025-11-12
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Done

**Files to Modify:**
- [ ] `/src/services/BaseService.ts`

**Implementation Steps:**
1. [ ] Delete hardcoded `EMPTY_PASS_PHRASE` constant (line 23)
2. [ ] Implement admin role check
3. [ ] Create confirmation token generation endpoint
4. [ ] Add token verification logic
5. [ ] Implement audit logging
6. [ ] Update API documentation
7. [ ] Test authorization flow

**Implementation Reference:**
```typescript
// Remove this line entirely
// const EMPTY_PASS_PHRASE = "nguyhiemvcl"; // DELETE

async empty(filter?: IQueryFilter<T>) {
    // New implementation with proper authorization
    if (!this.user || this.user.role !== 'admin') {
        throw new Error('Unauthorized: Admin role required');
    }

    const { confirmationToken } = filter || {};
    if (!confirmationToken) {
        throw new Error('Confirmation token required');
    }

    const isValid = await this.verifyDestructiveActionToken(confirmationToken);
    if (!isValid) {
        throw new Error('Invalid or expired confirmation token');
    }

    await SystemLogService.logCriticalAction({
        action: 'DATABASE_EMPTY',
        user: this.user._id,
        collection: this.model.collection.name,
        timestamp: new Date()
    });

    const deleteRes = await this.model.deleteMany({}).exec();
    return { ...deleteRes, error: null };
}
```

**Test Cases:**
- [ ] Reject non-admin users
- [ ] Reject missing token
- [ ] Reject expired token (>5 min)
- [ ] Reject invalid token
- [ ] Accept valid admin + fresh token
- [ ] Verify audit log created

**Definition of Done:**
- Hardcoded passphrase removed
- Admin authorization enforced
- Token-based confirmation required
- Audit logging implemented
- Tests passing

---

## 🟠 HIGH - Deploy within 1-2 Weeks

### ✅ Task 4: Add Security Headers (helmet.js)

**Assignee:** _____________
**Due Date:** 2025-11-18
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Done

**Files to Modify:**
- [ ] `/src/server.ts`
- [ ] `package.json`

**Implementation Steps:**
1. [ ] Install helmet: `pnpm add helmet`
2. [ ] Import helmet in server.ts
3. [ ] Configure CSP, HSTS, X-Frame-Options
4. [ ] Test admin panel still works
5. [ ] Test Swagger UI still works
6. [ ] Update documentation

**Dependencies:**
```bash
pnpm add helmet
pnpm add -D @types/helmet
```

**Configuration:**
```typescript
import helmet from 'helmet';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
}));
```

**Test Cases:**
- [ ] Verify CSP header present
- [ ] Verify HSTS header present
- [ ] Verify X-Frame-Options: DENY
- [ ] Admin panel loads correctly
- [ ] Swagger UI loads correctly

**Definition of Done:**
- Helmet installed and configured
- All security headers present
- Admin UI/Swagger functional
- Tests passing

---

### ✅ Task 5: Implement CSRF Protection

**Assignee:** _____________
**Due Date:** 2025-11-18
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Done

**Files to Modify:**
- [ ] `/src/server.ts`
- [ ] `/src/middlewares/csrf.ts` (new)
- [ ] Client-side code (admin UI)

**Implementation Steps:**
1. [ ] Install csurf: `pnpm add csurf`
2. [ ] Configure CSRF middleware
3. [ ] Create `/api/v1/csrf-token` endpoint
4. [ ] Update client to fetch token on init
5. [ ] Update client to include token in POST/PATCH/DELETE
6. [ ] Test CSRF protection
7. [ ] Update API documentation

**Dependencies:**
```bash
pnpm add csurf
pnpm add -D @types/csurf
```

**Test Cases:**
- [ ] POST without token returns 403
- [ ] POST with invalid token returns 403
- [ ] POST with valid token succeeds
- [ ] Token refreshes on expiry
- [ ] GET requests unaffected

**Definition of Done:**
- CSRF middleware active
- All state-changing routes protected
- Client integration complete
- Tests passing

---

### ✅ Task 6: Fix Empty Catch Blocks

**Assignee:** _____________
**Due Date:** 2025-11-24
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Done

**Files to Modify:**
- [ ] `/src/services/AppService.ts` (lines 96, 253)
- [ ] `/src/plugins/utils.ts` (lines 298, 533)
- [ ] `/src/modules/apps/new-app-by-form.ts` (line 151)
- [ ] `/src/modules/deploy/generate-deployment.ts` (line 338)
- [ ] `/src/modules/deploy/generate-deployment-v2.ts` (line 353)

**Implementation Template:**
```typescript
// Replace ALL empty catch blocks with:
try {
    // operation
} catch (e) {
    logError("[CONTEXT]", e);
    await SystemLogService.saveError(e, {
        context: "operation-name",
        userId: this.user?._id,
        workspaceId: this.workspace?._id
    });

    // Decide: throw, return default, or continue
    if (isCritical) {
        throw new Error(`Operation failed: ${e.message}`);
    }
    return defaultValue;
}
```

**Checklist:**
- [ ] AppService.ts:96 - Log git sync failures
- [ ] AppService.ts:253 - Log deployment update failures
- [ ] utils.ts:298 - Log utility errors
- [ ] utils.ts:533 - Log utility errors
- [ ] new-app-by-form.ts:151 - Log app creation errors
- [ ] generate-deployment.ts:338 - Log deployment errors
- [ ] generate-deployment-v2.ts:353 - Log deployment errors

**Definition of Done:**
- All empty catch blocks have logging
- Errors saved to database
- Appropriate error handling (throw vs return)
- Tests verify error logging

---

### ✅ Task 7: Deploy Input Sanitization

**Assignee:** _____________
**Due Date:** 2025-11-24
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Done

**Files to Modify:**
- [ ] `/src/plugins/input-sanitization.ts` (new)
- [ ] `/src/services/BaseService.ts`
- [ ] All controllers

**Implementation Steps:**
1. [ ] Install dependencies: `pnpm add dompurify jsdom validator`
2. [ ] Create sanitization utility
3. [ ] Integrate in BaseService.create()
4. [ ] Test with XSS payloads
5. [ ] Update documentation

**Dependencies:**
```bash
pnpm add dompurify jsdom validator
pnpm add -D @types/dompurify @types/jsdom @types/validator
```

**Test Cases:**
- [ ] Block `<script>alert('xss')</script>`
- [ ] Block `<img src=x onerror=alert(1)>`
- [ ] Sanitize rich text fields correctly
- [ ] Preserve safe HTML in descriptions

**Definition of Done:**
- Sanitization utility created
- Integrated in all create/update operations
- XSS payloads blocked
- Tests passing

---

## 🟡 MEDIUM - Deploy within 1 Month

### ✅ Task 8: Strengthen JWT Secret Validation

**Assignee:** _____________
**Due Date:** 2025-12-10
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Done

**Files to Modify:**
- [ ] `/src/modules/passports/jwtStrategy.ts`
- [ ] `/src/app.config.ts`

**Implementation:**
- [ ] Remove weak default "123" fallback
- [ ] Require min 32 character secrets
- [ ] Fail fast on startup if missing
- [ ] Update .env.example

**Definition of Done:**
- No weak defaults
- Startup validation enforced
- Documentation updated

---

### ✅ Task 9: Expand Rate Limiting

**Assignee:** _____________
**Due Date:** 2025-12-10
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Done

**Files to Modify:**
- [ ] `/src/server.ts`

**Implementation:**
- [ ] Add global rate limiter (100 req/min)
- [ ] Add API rate limiter (50 req/min)
- [ ] Keep strict auth limiter (10 req/min)
- [ ] Test rate limits

**Definition of Done:**
- Tiered rate limiting active
- Tests verify limits enforced

---

### ✅ Task 10: Implement Log Sanitization

**Assignee:** _____________
**Due Date:** 2025-12-10
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Done

**Files to Modify:**
- [ ] `/src/plugins/log-sanitizer.ts` (new)
- [ ] All log statements

**Implementation:**
- [ ] Create sanitizer to redact passwords, tokens, secrets
- [ ] Wrap all log functions
- [ ] Test log output

**Definition of Done:**
- Sensitive data redacted from logs
- All loggers wrapped

---

### ✅ Task 11: Adjust Body Size Limits

**Assignee:** _____________
**Due Date:** 2025-12-10
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Done

**Files to Modify:**
- [ ] `/src/server.ts`

**Implementation:**
- [ ] Set default 1MB limit
- [ ] Override for upload routes (10MB)
- [ ] Override for backup routes (50MB)

**Definition of Done:**
- Reasonable limits enforced
- Route-specific overrides work

---

### ✅ Task 12: Harden Cookie Settings

**Assignee:** _____________
**Due Date:** 2025-12-10
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Done

**Files to Modify:**
- [ ] `/src/server.ts`

**Implementation:**
- [ ] Set `httpOnly: true`
- [ ] Set `sameSite: 'strict'`
- [ ] Set `secure: true` in production
- [ ] Add domain restriction

**Definition of Done:**
- Cookies properly secured
- XSS/CSRF risks mitigated

---

## 🟢 LOW - Future Enhancements

### ✅ Task 13: Review CORS Configuration

**Status:** ⬜ Backlog

- [ ] Remove wildcard domains
- [ ] Use exact domain matching

---

### ✅ Task 14: Make Bcrypt Rounds Configurable

**Status:** ⬜ Backlog

- [ ] Add BCRYPT_ROUNDS env var
- [ ] Default to 12 rounds

---

## Progress Tracking

**Overall Completion:** 0/14 tasks (0%)

**By Priority:**
- CRITICAL: 0/3 (0%)
- HIGH: 0/4 (0%)
- MEDIUM: 0/5 (0%)
- LOW: 0/2 (0%)

**Target Dates:**
- Week 1: 3 critical tasks
- Week 2-3: 4 high tasks
- Month 2: 5 medium tasks
- Backlog: 2 low tasks

---

## Sign-Off

**Security Lead:** _______________ Date: _______

**Engineering Lead:** _______________ Date: _______

**CTO/VP Eng:** _______________ Date: _______

---

**Last Updated:** 2025-11-10
