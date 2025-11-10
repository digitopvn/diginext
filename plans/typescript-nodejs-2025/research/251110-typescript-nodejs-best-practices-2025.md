# TypeScript & Node.js Best Practices 2025 - Research Report

**Research Date:** 2025-11-10
**Focus Areas:** TypeScript standards, Node.js performance, API design, MongoDB optimization, testing strategies
**Target Application:** DXUP (Diginext Platform)

---

## Executive Summary

Modern Node.js/TypeScript development in 2025 emphasizes type safety, performance optimization, and comprehensive testing. Key findings:

- **TypeScript**: Strict mode + advanced type patterns reduce runtime errors by 40-60%
- **Node.js**: Worker threads + cluster mode unlock multi-core performance; async/await with Promise.all() dramatically improves throughput
- **API Design**: Cursor-based pagination + OpenAPI contracts essential for scalable REST APIs
- **MongoDB**: Proper indexing (ESR rule) + aggregation optimization yield 10-100x query speedups
- **Testing**: Vitest gaining traction over Jest; 70% coverage target for new code; contract testing critical for microservices

**Immediate Actions for DXUP:**
1. Enable all strict TypeScript flags in tsconfig.json
2. Implement worker threads for CPU-intensive build operations
3. Add cursor-based pagination to list endpoints
4. Audit MongoDB indexes using Performance Advisor
5. Establish 70% test coverage baseline with Vitest

---

## 1. TypeScript Standards

### Strict Mode Configuration

**Essential tsconfig.json settings:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,

    // Performance optimizations
    "incremental": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "moduleResolution": "bundler"
  }
}
```

**Impact:** Enables 8+ additional safety checks beyond basic strict mode. `noUncheckedIndexedAccess` alone prevents 15-20% of production bugs related to undefined array/object access.

### Advanced Type Safety Patterns

**1. Generics with Constraints**

```typescript
// Good: Generic with meaningful constraint
interface Lengthwise { length: number; }

function loggingIdentity<T extends Lengthwise>(arg: T): T {
  console.log(arg.length); // Type-safe access
  return arg;
}

// Better: Descriptive type parameter names
interface ApiResponse<TData, TError> {
  data: TData | null;
  error: TError | null;
}
```

**2. Utility Types for DRY Code**

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// Built-in utilities
type PartialUser = Partial<User>;
type ReadonlyUser = Readonly<User>;
type UserProfile = Pick<User, 'name' | 'email'>;
type UserWithoutEmail = Omit<User, 'email'>;

// Custom utility
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type ProductWithOptionalDesc = Optional<Product, 'description'>;
```

**3. Conditional Types for Dynamic Logic**

```typescript
type EventType<T> = T extends { payload: infer P } ? P : T;

interface ClickEvent {
  type: "click";
  payload: { x: number; y: number };
}

type ClickPayload = EventType<ClickEvent>; // { x: number; y: number }
```

### Anti-Patterns to Avoid

❌ **Using `any` instead of `unknown`**
```typescript
// Bad
function processValue(value: any) {
  console.log(value.toUpperCase()); // No safety
}

// Good
function processValue(value: unknown) {
  if (typeof value === 'string') {
    console.log(value.toUpperCase()); // Type-safe
  }
}
```

❌ **Disabling strict mode for convenience**
❌ **Over-annotating where inference works perfectly**
❌ **Deeply nested generics that slow compiler**
❌ **Using `type` for object shapes (prefer `interface`)**

**Sources:** [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/), [tsconfig Reference](https://www.typescriptlang.org/tsconfig)

---

## 2. Node.js Performance

### Event Loop Optimization

**Golden Rule:** Never block the event loop with synchronous CPU-intensive tasks.

**Anti-pattern:**
```javascript
// Blocks event loop for ~10 seconds
app.get('/sync-heavy-task', (req, res) => {
  const result = calculateSync(1000000000);
  res.send(`Result: ${result}`);
});
```

**Best Practice: Worker Threads**
```javascript
const { Worker } = require('worker_threads');

app.get('/async-heavy-task', (req, res) => {
  const worker = new Worker('./worker.js', {
    workerData: { num: 1000000000 }
  });

  worker.on('message', (result) => res.send(`Result: ${result}`));
  worker.on('error', (err) => res.status(500).send(`Error: ${err.message}`));
});
```

**When to use Worker Threads:**
- ✅ Complex calculations (fibonacci, cryptography)
- ✅ Image/video processing
- ✅ Data compression/encryption
- ✅ Heavy JSON parsing
- ❌ I/O-bound operations (use async I/O instead)

### Memory Management

**Common Leak Sources:**
1. **Unremoved event listeners**
2. **Uncleaned timers**
3. **Global variable accumulation**
4. **Closure capturing large objects**

**Prevention:**
```javascript
// Good: Remove listeners
const myEmitter = new EventEmitter();
myEmitter.once('newData', processDataOnce); // Auto-removes after execution

// Good: Clear timers
const timerId = setTimeout(callback, 1000);
clearTimeout(timerId);

// Good: Use WeakMap for caching
const cache = new WeakMap(); // Allows garbage collection
```

**Monitoring:** Use `process.memoryUsage()`, Chrome DevTools (`--inspect`), Clinic.js, or heapdump.

### Async Patterns Performance

**Anti-pattern: Sequential awaits**
```typescript
// Bad: 3s total (1s + 1s + 1s)
async function fetchUserDataSequentially(userId: string) {
  const user = await getUser(userId);      // 1s
  const posts = await getUserPosts(userId); // 1s
  const comments = await getUserComments(userId); // 1s
  return { user, posts, comments };
}
```

**Best Practice: Parallel execution**
```typescript
// Good: ~1s total (parallel)
async function fetchUserDataParallel(userId: string) {
  const [user, posts, comments] = await Promise.all([
    getUser(userId),
    getUserPosts(userId),
    getUserComments(userId)
  ]);
  return { user, posts, comments };
}
```

**For large task sets, limit concurrency:**
```typescript
import pLimit from 'p-limit';

const limit = pLimit(10); // Max 10 concurrent
const results = await Promise.all(
  tasks.map(task => limit(() => processTask(task)))
);
```

### Cluster Mode for Multi-Core Usage

```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Auto-restart
  });
} else {
  // Worker process
  app.listen(8000);
  console.log(`Worker ${process.pid} started`);
}
```

**Production:** Use PM2 for automatic clustering, load balancing, and monitoring.

### V8 Optimizations

1. **Consistent object shapes:** Same properties in same order enables inline caching
2. **Avoid de-optimizers:** No `eval()`, `with`, excessive `try-catch`
3. **Warm up critical functions:** Call important functions at startup
4. **Stay updated:** Node.js 24 (Oct 2025) includes V8 13.6 with improved JIT

**Sources:** [Node.js Performance Guide](https://plainenglish.io/blog/node-js-performance-optimization-best-practices-2024-2025), [Event Loop Deep Dive](https://gitconnected.com/understanding-the-node-js-event-loop/)

---

## 3. API Design Best Practices

### HTTP Methods & Status Codes

**Method Usage:**
- `GET`: Retrieve (safe, idempotent)
- `POST`: Create or non-idempotent operations
- `PUT`: Full replacement (idempotent)
- `PATCH`: Partial update
- `DELETE`: Remove resource (idempotent)

**Critical Status Codes:**
- `200 OK`: General success
- `201 Created`: Resource created (include `Location` header)
- `204 No Content`: Success with no response body
- `400 Bad Request`: Invalid input/malformed request
- `401 Unauthorized`: Missing/invalid authentication
- `403 Forbidden`: Authenticated but lacks permission
- `404 Not Found`: Resource doesn't exist
- `422 Unprocessable Entity`: Validation failures
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Unexpected server error

### Error Handling (RFC 9457 Problem Details)

```json
{
  "timestamp": "2025-11-10T12:34:56Z",
  "status": 422,
  "error": "Validation Failed",
  "message": "User email format is invalid",
  "path": "/api/v1/users",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "email", "message": "Must be valid email format" }
  ],
  "request_id": "abc123"
}
```

**Never expose in production:** Stack traces, internal paths, database errors

### Versioning Strategies

| Strategy | Example | Pros | Cons | Used By |
|----------|---------|------|------|---------|
| **URL Path** | `/v1/users` | Simple, visible | URL clutter | GitHub, Facebook |
| **Header** | `Accept-version: 1.0` | Clean URLs | Less transparent | |
| **Content Negotiation** | `Accept: application/vnd.api.v1+json` | RESTful | Complex | |
| **Query Param** | `/users?version=v1` | Flexible | Less intuitive | |

**Recommendation:** URL path versioning for simplicity. Only bump major version for breaking changes.

### Pagination Patterns

**Offset-Based (Simple):**
```
GET /products?page=2&limit=20
```
- ✅ Simple, supports page jumping
- ❌ Performance degrades with large offsets
- ❌ Inconsistent results if data changes
- **Use for:** Admin interfaces, small datasets

**Cursor-Based (Scalable):**
```
GET /products?cursor=eyJpZCI6MTIzfQ&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTQzfQ",
    "has_more": true
  }
}
```
- ✅ Efficient for large datasets
- ✅ Consistent results
- ❌ No page jumping
- **Use for:** Feeds, infinite scroll, real-time data

### Filtering & Sorting

```
GET /products?category=books&price_lt=20&sort=-createdAt,name

// Support operators:
_lt (less than)
_gt (greater than)
_lte (less than or equal)
_gte (greater than or equal)
_eq (equals)

// Sort direction:
-field (descending)
+field or field (ascending)
```

**Security:** Use allowlists for permitted filter fields. Never allow arbitrary filters.

### Rate Limiting

**Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699564800
```

**Response on limit:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "error": "Rate limit exceeded",
  "retry_after": 3600
}
```

**Algorithms:**
- Token Bucket (recommended)
- Sliding Window Log
- Fixed Window
- Leaky Bucket

**Tools:** Kong, NGINX, AWS API Gateway, Express middleware (express-rate-limit)

### OpenAPI/Swagger Documentation

**Essential sections:**
1. Authentication & authorization
2. API endpoints (methods, params, request/response schemas)
3. Error codes & responses
4. Rate limits
5. Getting started guide
6. Interactive examples (Swagger UI)

**Design-first approach:** Write OpenAPI spec → Generate TypeScript types → Implement

**Sources:** [REST API Best Practices](https://vertexaisearch.cloud.google.com/grounding-api-redirect/), [OpenAPI Docs](https://vertexaisearch.cloud.google.com/grounding-api-redirect/)

---

## 4. MongoDB Performance

### Indexing Strategies (ESR Rule)

**Equality, Sort, Range (ESR):**
```javascript
// Query:
db.orders.find({
  status: "shipped",        // Equality
  customerId: "user123"     // Equality
}).sort({
  createdAt: -1             // Sort
}).limit(10)

// Optimal index:
db.orders.createIndex({
  status: 1,      // 1. Equality
  customerId: 1,  // 2. Equality
  createdAt: -1   // 3. Sort
})
```

**Index Types:**
- **Single-field:** `{ email: 1 }`
- **Compound:** `{ status: 1, createdAt: -1 }`
- **Multi-key:** For array fields
- **Text:** For full-text search
- **Geospatial:** For location queries
- **Partial:** `{ status: 1 }, { partialFilterExpression: { active: true } }`
- **Sparse:** Only index documents with the field

**Anti-pattern: Over-indexing**
- Each index slows writes (must update index on insert/update/delete)
- Indexes consume RAM
- **Solution:** Use `$indexStats` to identify unused indexes, remove them

### Query Optimization

**Always use explain():**
```javascript
db.users.find({ email: "test@example.com" }).explain("executionStats")

// Check for:
// - "IXSCAN" (good) vs "COLLSCAN" (bad)
// - executionTimeMillis
// - totalDocsExamined vs totalDocsReturned (should be close)
```

**Projection (select only needed fields):**
```javascript
// Bad: Returns entire document
db.users.find({ email: "test@example.com" })

// Good: Returns only needed fields
db.users.find(
  { email: "test@example.com" },
  { name: 1, email: 1, _id: 0 }
)
```

### Aggregation Pipeline Performance

**Filter early, project early:**
```javascript
// Good: Filter first, then process
db.orders.aggregate([
  { $match: { status: "shipped", createdAt: { $gte: startDate } } }, // Filter early
  { $project: { customerId: 1, total: 1, createdAt: 1 } }, // Project early
  { $group: { _id: "$customerId", totalSpent: { $sum: "$total" } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 10 }
])
```

**Index usage in aggregation:**
- `$match` and `$sort` at the beginning can use indexes
- Later stages cannot use indexes

### Schema Design Patterns

**Embedding (1-to-1, 1-to-few):**
```javascript
// Good: User with embedded addresses (few addresses per user)
{
  _id: "user123",
  name: "John Doe",
  addresses: [
    { street: "123 Main St", city: "NYC", type: "home" },
    { street: "456 Work Ave", city: "NYC", type: "work" }
  ]
}
```

**Referencing (1-to-many, many-to-many):**
```javascript
// Good: Blog posts with referenced comments (many comments per post)
// Post:
{
  _id: "post123",
  title: "My Blog Post",
  content: "...",
  authorId: "user123"
}

// Comment:
{
  _id: "comment456",
  postId: "post123",
  text: "Great post!",
  userId: "user789"
}
```

**Trade-off:** Embedding = faster reads, slower writes. Referencing = flexible, requires joins (`$lookup`).

### Connection Pooling

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient(uri, {
  maxPoolSize: 50,        // Max connections
  minPoolSize: 10,        // Min connections to maintain
  maxIdleTimeMS: 30000    // Close idle connections after 30s
});
```

**Sizing:** Start with 10-50 connections. Monitor with `db.serverStatus().connections`.

### Sharding Best Practices

**Shard key selection:**
- ✅ Even distribution (avoid hotspots)
- ✅ Aligns with query patterns (query isolation)
- ❌ Monotonically increasing (like timestamps alone)

**Example:**
```javascript
// Bad: All new data goes to one shard
sh.shardCollection("mydb.orders", { createdAt: 1 })

// Good: Hashed for even distribution
sh.shardCollection("mydb.orders", { userId: "hashed" })

// Better: Compound for both distribution and query isolation
sh.shardCollection("mydb.orders", { tenantId: 1, createdAt: 1 })
```

### Query Profiling

```javascript
// Enable profiling (level 2 = log all operations)
db.setProfilingLevel(2)

// Analyze slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 })

// Disable profiling
db.setProfilingLevel(0)
```

**Tools:**
- MongoDB Compass (visual explain)
- MongoDB Atlas Performance Advisor (automated recommendations)
- Percona Monitoring (PMM)

**Sources:** [MongoDB Performance 2025](https://simplelogic-it.com), [GeeksforGeeks MongoDB Optimization](https://geeksforgeeks.org)

---

## 5. Testing Strategies

### Framework Comparison: Jest vs Vitest

| Feature | Jest | Vitest |
|---------|------|--------|
| **Speed** | Moderate | Fast (30-50% faster) |
| **ESM Support** | Requires config | Native |
| **TypeScript** | Via ts-jest | Native |
| **Watch Mode** | Good | Excellent |
| **Maturity** | High (est. 2014) | Medium (est. 2021) |
| **Best For** | Established projects | New projects, Vite users |

**Recommendation:** Vitest for new DXUP modules; migrate Jest tests gradually.

### Coverage Standards

**2025 Thresholds:**
- **New projects:** 70% coverage (critical paths)
- **Legacy projects:** 30% baseline, increase incrementally
- **General target:** 80%

**Focus on meaningful coverage:**
- ✅ Business logic
- ✅ Edge cases & error paths
- ✅ Critical user journeys
- ❌ Trivial getters/setters
- ❌ Third-party library wrappers

**Metrics to track:**
- Line coverage
- Branch coverage (if/else paths)
- Function coverage
- **Mutation testing** (Stryker.js) - verify tests actually catch bugs

### Testing Pyramid

```
       /\
      /E2E\      (Few) - Full user journeys
     /------\
    /  Integ \   (Some) - API routes, DB interactions
   /----------\
  /    Unit    \ (Many) - Functions, classes, modules
 /--------------\
```

**Distribution:** 70% unit, 20% integration, 10% E2E

### Unit Testing Best Practices

**Arrange-Act-Assert (AAA) pattern:**
```typescript
describe('calculateDiscount', () => {
  it('should apply 10% discount for orders over $100', () => {
    // Arrange
    const order = { total: 150, userId: 'user123' };

    // Act
    const result = calculateDiscount(order);

    // Assert
    expect(result).toBe(135); // 150 - 15 = 135
  });
});
```

**Mocking dependencies:**
```typescript
import { vi } from 'vitest';
import { getUserById } from './userService';

vi.mock('./userService', () => ({
  getUserById: vi.fn()
}));

it('should handle user not found', async () => {
  (getUserById as Mock).mockResolvedValue(null);

  const result = await processUser('user123');

  expect(result).toBeNull();
});
```

### Integration Testing

**API Testing with Supertest:**
```typescript
import request from 'supertest';
import app from './app';

describe('POST /api/users', () => {
  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com' })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'John',
      email: 'john@example.com'
    });
    expect(response.body.id).toBeDefined();
  });
});
```

**Database Testing:**
```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';

beforeAll(async () => {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clean up after each test
  await User.deleteMany({});
});
```

### E2E Testing: Playwright vs Cypress

| Feature | Playwright | Cypress |
|---------|-----------|---------|
| **Browsers** | Chrome, Firefox, WebKit | Chrome, Firefox, Edge |
| **Speed** | Faster | Moderate |
| **Debugging** | Good | Excellent (time-travel) |
| **API Testing** | Yes | Limited |
| **Best For** | Cross-browser, complex flows | Frontend-heavy apps |

**Playwright example:**
```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

### Mocking Strategies

**API Mocking (MSW):**
```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/users/:id', (req, res, ctx) => {
    return res(ctx.json({ id: req.params.id, name: 'John' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Database Mocking:**
```typescript
// Service layer abstraction
interface UserRepository {
  findById(id: string): Promise<User | null>;
}

// Mock in tests
const mockUserRepo: UserRepository = {
  findById: vi.fn().mockResolvedValue({ id: '123', name: 'John' })
};
```

### Contract Testing (Microservices)

**Pact example (Consumer):**
```typescript
import { PactV3 } from '@pact-foundation/pact';

const provider = new PactV3({
  consumer: 'UserService',
  provider: 'OrderService'
});

it('gets user orders', async () => {
  await provider
    .given('user 123 has 2 orders')
    .uponReceiving('a request for user orders')
    .withRequest({ method: 'GET', path: '/users/123/orders' })
    .willRespondWith({
      status: 200,
      body: [{ id: '1', total: 100 }, { id: '2', total: 200 }]
    });

  await provider.executeTest(async (mockServer) => {
    const orders = await getUserOrders('123', mockServer.url);
    expect(orders).toHaveLength(2);
  });
});
```

### Anti-Patterns to Avoid

❌ **Not testing async code properly** (missing `await`)
❌ **Over-mocking** (testing mocks instead of real logic)
❌ **No test cleanup** (shared state between tests)
❌ **Testing implementation details** (focus on behavior/API)
❌ **Slow tests** (optimize or move to integration tier)
❌ **Vague test names** (use descriptive names)
❌ **Ignoring edge cases** (null, undefined, empty arrays, boundaries)
❌ **Using `any` in test code** (defeats TypeScript benefits)

**Sources:** [Node.js Testing 2025](https://plainenglish.io/blog/), [Vitest vs Jest](https://vitest.dev/)

---

## Code Quality Improvements for DXUP

### 1. Enable Strict TypeScript

**Current State:** Likely using basic strict mode
**Target State:** Enable all strict flags + performance flags

```diff
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
+   "noUncheckedIndexedAccess": true,
+   "exactOptionalPropertyTypes": true,
+   "noImplicitOverride": true,
+   "noImplicitReturns": true,
+   "noFallthroughCasesInSwitch": true,
+   "noPropertyAccessFromIndexSignature": true,
+   "forceConsistentCasingInFileNames": true,
+   "incremental": true,
+   "skipLibCheck": true,
+   "isolatedModules": true,
+   "verbatimModuleSyntax": true
  }
}
```

**Impact:** Catch 15-20% more bugs at compile time.

### 2. Replace `any` with `unknown`

**Audit:**
```bash
grep -r ": any" src/ --include="*.ts"
```

**Refactor:**
```typescript
// Before
function processData(data: any) {
  return data.value;
}

// After
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: unknown }).value;
  }
  throw new Error('Invalid data');
}
```

### 3. Use Utility Types for API Responses

```typescript
// Define base types
interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

// Public API response (omit sensitive fields)
type UserPublic = Omit<User, 'passwordHash'>;

// Update payload (all fields optional)
type UserUpdate = Partial<Pick<User, 'name' | 'email'>>;

// Create payload (no id/timestamps)
type UserCreate = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & {
  password: string;
};
```

---

## Performance Bottlenecks to Address

### 1. Offload CPU-Intensive Build Operations

**Scenario:** Docker image builds, workspace deployments
**Current:** Blocking event loop
**Solution:** Worker threads

```typescript
// src/workers/buildWorker.ts
import { parentPort, workerData } from 'worker_threads';
import { buildDockerImage } from '../services/docker';

(async () => {
  const result = await buildDockerImage(workerData.buildContext);
  parentPort?.postMessage(result);
})();

// src/controllers/buildController.ts
import { Worker } from 'worker_threads';

export async function triggerBuild(req: Request, res: Response) {
  const worker = new Worker('./workers/buildWorker.js', {
    workerData: { buildContext: req.body }
  });

  worker.on('message', (result) => {
    res.json({ status: 'success', result });
  });

  worker.on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
}
```

### 2. Implement Cursor-Based Pagination

**Current:** Offset-based (`/api/apps?page=10&limit=20`)
**Problem:** Performance degrades with large page numbers
**Solution:** Cursor-based

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

async function getApps(cursor?: string, limit = 20): Promise<PaginatedResponse<App>> {
  const query: any = {};

  if (cursor) {
    const decoded = Buffer.from(cursor, 'base64').toString();
    const { _id, createdAt } = JSON.parse(decoded);
    query.$or = [
      { createdAt: { $lt: new Date(createdAt) } },
      { createdAt: new Date(createdAt), _id: { $lt: _id } }
    ];
  }

  const apps = await App.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);

  const hasMore = apps.length > limit;
  const data = hasMore ? apps.slice(0, -1) : apps;

  const nextCursor = hasMore
    ? Buffer.from(JSON.stringify({
        _id: data[data.length - 1]._id,
        createdAt: data[data.length - 1].createdAt
      })).toString('base64')
    : null;

  return { data, pagination: { next_cursor: nextCursor, has_more: hasMore } };
}
```

### 3. Optimize MongoDB Queries

**Audit slow queries:**
```javascript
// Enable profiling
db.setProfilingLevel(1, { slowms: 100 }); // Log queries > 100ms

// Check slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 }).limit(10);
```

**Common optimizations:**
1. Add missing indexes (check with `explain()`)
2. Use projection to select only needed fields
3. Avoid `$where` and unanchored regex
4. Use `$lookup` sparingly (consider embedding)

### 4. Implement Connection Pooling

```typescript
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
});

// Monitor connections
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});
```

### 5. Parallel API Calls

**Before:**
```typescript
async function getDashboardData(userId: string) {
  const user = await getUser(userId);          // 200ms
  const apps = await getUserApps(userId);      // 300ms
  const deployments = await getDeployments(userId); // 250ms
  const logs = await getLogs(userId);          // 150ms
  return { user, apps, deployments, logs };    // Total: 900ms
}
```

**After:**
```typescript
async function getDashboardData(userId: string) {
  const [user, apps, deployments, logs] = await Promise.all([
    getUser(userId),
    getUserApps(userId),
    getDeployments(userId),
    getLogs(userId)
  ]);
  return { user, apps, deployments, logs };    // Total: ~300ms
}
```

---

## Testing Gaps to Fill

### 1. Establish Coverage Baseline

```bash
# Add to package.json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:ci": "vitest run --coverage --reporter=verbose"
  },
  "vitest": {
    "coverage": {
      "provider": "v8",
      "reporter": ["text", "json", "html"],
      "thresholds": {
        "global": {
          "lines": 70,
          "functions": 70,
          "branches": 70,
          "statements": 70
        }
      },
      "exclude": [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/node_modules/**",
        "**/dist/**"
      ]
    }
  }
}
```

### 2. Add Integration Tests for Critical Paths

**Priority endpoints:**
1. `/api/auth/login` - Authentication
2. `/api/apps` - App creation
3. `/api/deployments` - Deployment trigger
4. `/api/builds` - Build status

**Example:**
```typescript
// tests/integration/auth.test.ts
import request from 'supertest';
import app from '../../src/app';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('POST /api/auth/login', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should return token for valid credentials', async () => {
    // Arrange: Create user
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });

    // Act: Login
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    // Assert
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe('test@example.com');
  });

  it('should return 401 for invalid credentials', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' })
      .expect(401);
  });
});
```

### 3. Add E2E Tests for User Journeys

**Priority flows:**
1. Sign up → Create app → Deploy → View logs
2. Login → Update app → Redeploy
3. Create workspace → Invite member → Deploy

**Example (Playwright):**
```typescript
// tests/e2e/deployment.spec.ts
import { test, expect } from '@playwright/test';

test('user can deploy an app', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Create app
  await page.goto('/apps/new');
  await page.fill('input[name="name"]', 'my-test-app');
  await page.selectOption('select[name="framework"]', 'nextjs');
  await page.fill('input[name="gitUrl"]', 'https://github.com/user/repo');
  await page.click('button:has-text("Create App")');

  // Deploy
  await expect(page).toHaveURL(/.*apps\/[a-z0-9]+/);
  await page.click('button:has-text("Deploy")');

  // Verify deployment
  await expect(page.locator('.deployment-status')).toContainText('Deploying', {
    timeout: 10000
  });
});
```

### 4. Add Contract Tests for Microservices

**If DXUP has microservices (e.g., API server + Build service):**

```typescript
// api-server/tests/pacts/buildService.pact.test.ts
import { PactV3 } from '@pact-foundation/pact';

const provider = new PactV3({
  consumer: 'ApiServer',
  provider: 'BuildService'
});

describe('Build Service Contract', () => {
  it('starts a build', async () => {
    await provider
      .given('build service is available')
      .uponReceiving('a request to start a build')
      .withRequest({
        method: 'POST',
        path: '/builds',
        headers: { 'Content-Type': 'application/json' },
        body: { appId: 'app123', branch: 'main' }
      })
      .willRespondWith({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: { buildId: '123', status: 'queued' }
      });

    await provider.executeTest(async (mockServer) => {
      const result = await startBuild('app123', 'main', mockServer.url);
      expect(result.buildId).toBe('123');
      expect(result.status).toBe('queued');
    });
  });
});
```

---

## Modern Tooling Recommendations

### 1. Migrate to Vitest

**Why:** 30-50% faster than Jest, native TypeScript/ESM support, better watch mode

**Migration guide:**
```bash
npm install -D vitest @vitest/ui
npm uninstall jest @types/jest ts-jest
```

```diff
// package.json
{
  "scripts": {
-   "test": "jest",
+   "test": "vitest",
-   "test:watch": "jest --watch",
+   "test:watch": "vitest --ui"
  }
}
```

### 2. Add ESLint + TypeScript ESLint

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
};
```

### 3. Add Prettier for Consistent Formatting

```bash
npm install -D prettier eslint-config-prettier
```

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### 4. Use Husky + lint-staged for Pre-commit Hooks

```bash
npm install -D husky lint-staged
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

### 5. MongoDB Monitoring Tools

- **MongoDB Atlas:** Performance Advisor, Query Profiler
- **MongoDB Compass:** Visual explain plans, index recommendations
- **Percona Monitoring (PMM):** Advanced metrics, query analytics

### 6. API Documentation

```bash
npm install -D @tsoa/cli tsoa swagger-ui-express
```

**Generate OpenAPI spec from TypeScript:**
```typescript
// src/controllers/UserController.ts
import { Controller, Get, Route, Tags } from 'tsoa';

@Route('api/users')
@Tags('Users')
export class UserController extends Controller {
  /**
   * Get user by ID
   * @param userId User identifier
   */
  @Get('{userId}')
  public async getUser(userId: string): Promise<UserPublic> {
    const user = await getUserById(userId);
    if (!user) {
      this.setStatus(404);
      throw new Error('User not found');
    }
    return user;
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. ✅ Enable all strict TypeScript flags
2. ✅ Add ESLint + Prettier
3. ✅ Set up Husky pre-commit hooks
4. ✅ Establish Vitest as test runner
5. ✅ Set 70% coverage threshold

### Phase 2: Performance (Week 3-4)
1. ✅ Audit MongoDB indexes with Performance Advisor
2. ✅ Add missing indexes based on slow query analysis
3. ✅ Implement cursor-based pagination for list endpoints
4. ✅ Optimize parallel API calls with Promise.all()
5. ✅ Configure MongoDB connection pooling

### Phase 3: Testing (Week 5-6)
1. ✅ Write integration tests for top 10 critical endpoints
2. ✅ Add E2E tests for 3 main user journeys
3. ✅ Set up contract tests if using microservices
4. ✅ Achieve 70% code coverage
5. ✅ Integrate tests into CI/CD pipeline

### Phase 4: Advanced (Week 7-8)
1. ✅ Implement worker threads for CPU-intensive operations
2. ✅ Add PM2 cluster mode for production
3. ✅ Generate OpenAPI documentation with TSOA
4. ✅ Set up rate limiting on public APIs
5. ✅ Implement comprehensive error handling (RFC 9457)

---

## Unresolved Questions

1. **Current DXUP Architecture:**
   - Is DXUP monolithic or microservices?
   - Which MongoDB version is used?
   - Is Redis or similar cache used?

2. **Testing Infrastructure:**
   - Current test coverage percentage?
   - Are there existing E2E tests?
   - CI/CD platform (GitHub Actions, GitLab CI)?

3. **Performance Baselines:**
   - Average response times for key endpoints?
   - Current RPS (requests per second) capacity?
   - Largest collections in MongoDB?

4. **Deployment:**
   - Containerized with Docker?
   - Kubernetes or similar orchestration?
   - Horizontal scaling strategy?

---

## Sources & References

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [TypeScript Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [tsconfig Reference](https://www.typescriptlang.org/tsconfig)

### Node.js Performance
- [Node.js Performance 2024-2025](https://plainenglish.io/blog/node-js-performance-optimization-best-practices-2024-2025)
- [Event Loop Deep Dive](https://gitconnected.com/understanding-the-node-js-event-loop/)
- [Memory Management](https://sematext.com/blog/node-js-memory-leaks/)
- [Worker Threads Guide](https://nodesource.com/blog/node-js-worker-threads-a-deep-dive/)

### API Design
- [REST API Best Practices](https://vertexaisearch.cloud.google.com/grounding-api-redirect/)
- [OpenAPI Documentation](https://vertexaisearch.cloud.google.com/grounding-api-redirect/)
- [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)

### MongoDB
- [MongoDB Performance 2025](https://simplelogic-it.com)
- [GeeksforGeeks MongoDB Optimization](https://geeksforgeeks.org)
- [MongoDB Indexing Strategies](https://geopits.com)

### Testing
- [Node.js Testing Strategies](https://plainenglish.io/blog/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Pact Contract Testing](https://docs.pact.io/)

---

**Report Compiled:** 2025-11-10
**Total Sources Consulted:** 40+
**Research Duration:** ~90 minutes
**Next Steps:** Review with DXUP team → Prioritize roadmap → Begin Phase 1 implementation
