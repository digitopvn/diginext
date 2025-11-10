# Security Review - Quick Reference Card

**Version:** 3.36.2 | **Date:** 2025-11-10 | **Status:** 🔴 HIGH RISK

---

## 🚨 Critical - Fix NOW (24-48 Hours)

### 1. Encrypt Kubernetes Credentials
```typescript
// ❌ VULNERABLE (plaintext in DB)
kubeConfig: { type: String }

// ✅ SECURE (encrypted)
kubeConfig: {
    encrypted: { type: String },
    iv: { type: String },
    tag: { type: String }
}
```
**Files:** `Cluster.ts`, `ContainerRegistry.ts`

---

### 2. Block NoSQL Injection
```typescript
// ❌ VULNERABLE
if (_filter.or) _filter.$or = _filter.or;  // NO VALIDATION

// ✅ SECURE
const ALLOWED = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin'];
const BLOCKED = ['$where', '$regex', '$expr', '$function'];
// Validate all operators before use
```
**File:** `parse-request-filter.ts`

---

### 3. Remove Hardcoded Password
```typescript
// ❌ VULNERABLE
const EMPTY_PASS_PHRASE = "nguyhiemvcl";  // DELETE THIS

// ✅ SECURE
// Require admin role + time-limited token
if (!this.user || this.user.role !== 'admin') throw new Error('Unauthorized');
// Verify confirmation token
```
**File:** `BaseService.ts:23`

---

## 🔥 High Priority (1-2 Weeks)

### 4. Add Security Headers
```bash
pnpm add helmet
```
```typescript
import helmet from 'helmet';
app.use(helmet({ /* config */ }));
```
**File:** `server.ts`

---

### 5. CSRF Protection
```bash
pnpm add csurf
```
```typescript
app.use(csrf({ cookie: { httpOnly: true, secure: true } }));
```
**File:** `server.ts`

---

### 6. Fix Empty Catches
```typescript
// ❌ BAD
try { } catch (e) {}

// ✅ GOOD
try { } catch (e) {
    logError("[CONTEXT]", e);
    await SystemLogService.saveError(e, { context: "..." });
}
```
**Files:** `AppService.ts:96,253`, `utils.ts:298,533`, `new-app-by-form.ts:151`, `generate-deployment.ts:338`, `generate-deployment-v2.ts:353`

---

### 7. Input Sanitization
```bash
pnpm add dompurify jsdom validator
```
```typescript
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty);
```
**File:** Create `plugins/input-sanitization.ts`

---

## 🟡 Medium Priority (1 Month)

### 8. Strengthen JWT Secrets
```typescript
// ❌ WEAK
const secret = Config.grab("JWT_SECRET", "123");

// ✅ STRONG
const secret = Config.grab("JWT_SECRET");
if (!secret || secret.length < 32) throw new Error('Invalid JWT_SECRET');
```

---

### 9. Expand Rate Limiting
```typescript
// Apply to ALL routes, not just auth
app.use(globalRateLimiter);
app.use('/api/v1', apiRateLimiter);
```

---

### 10. Sanitize Logs
```typescript
// Redact secrets from logs
log(message.replace(/password[=:]\s*\S+/gi, 'password=***'));
```

---

### 11. Body Size Limits
```typescript
// ❌ TOO LARGE
app.use(bodyParser.json({ limit: "200mb" }));

// ✅ REASONABLE
app.use(bodyParser.json({ limit: "1mb" }));  // default
app.use('/upload', bodyParser.json({ limit: "10mb" }));  // specific routes
```

---

### 12. Harden Cookies
```typescript
session({
    httpOnly: true,      // ✅ Prevent XSS
    secure: true,        // ✅ HTTPS only
    sameSite: 'strict',  // ✅ Prevent CSRF
})
```

---

## 🔍 Attack Vectors to Test

**NoSQL Injection:**
```bash
# Should be BLOCKED
GET /api/v1/users?or[0][password][$ne]=null
GET /api/v1/users?email[$regex]=.*
GET /api/v1/clusters?kubeConfig[$exists]=true
```

**XSS:**
```html
<script>alert('xss')</script>
<img src=x onerror=alert(1)>
```

**CSRF:**
```javascript
// POST without CSRF token should fail
fetch('/api/v1/clusters', { method: 'POST', body: '...' })
```

---

## 📊 Progress Tracking

```
Total: 14 tasks
├── CRITICAL:  □□□ (0/3)
├── HIGH:      □□□□ (0/4)
├── MEDIUM:    □□□□□ (0/5)
└── LOW:       □□ (0/2)
```

**Target Dates:**
- 🔴 2025-11-12: Critical complete
- 🟠 2025-11-24: High complete
- 🟡 2025-12-10: Medium complete

---

## 📞 Quick Help

**Full Details:** `plans/security-review-251110/README.md`
**Task List:** `plans/security-review-251110/REMEDIATION-CHECKLIST.md`
**Deep Dive:** `plans/security-review-251110/reports/251110-security-audit-comprehensive-report.md`

**Contact:** code-reviewer agent
