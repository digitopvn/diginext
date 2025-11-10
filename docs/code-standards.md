# Code Standards & Best Practices

> **Last Updated:** 2025-11-10
> **Version:** 3.36.2

## Table of Contents
- [File Organization](#file-organization)
- [Naming Conventions](#naming-conventions)
- [TypeScript Standards](#typescript-standards)
- [Architecture Patterns](#architecture-patterns)
- [Database Standards](#database-standards)
- [API Standards](#api-standards)
- [Testing Standards](#testing-standards)
- [Error Handling](#error-handling)
- [Security Standards](#security-standards)
- [Code Documentation](#code-documentation)

## File Organization

### Directory Structure Principles

#### 1. Module-Based Organization
```
src/
├── modules/          # Business logic modules (feature-based)
│   ├── apps/        # Application management features
│   ├── build/       # Build orchestration features
│   ├── deploy/      # Deployment features
│   └── [feature]/   # Each feature in its own directory
├── entities/        # MongoDB models (data layer)
├── services/        # Business logic services
├── controllers/     # API controllers (presentation layer)
├── interfaces/      # TypeScript type definitions
├── middlewares/     # Express middleware
├── routes/          # API route definitions
└── plugins/         # Utility functions and helpers
```

#### 2. Module Internal Structure
Each module should contain:
```
modules/[feature]/
├── index.ts                    # Public exports
├── [feature]-service.ts        # Main service logic
├── [feature]-utils.ts          # Utility functions
├── [feature]-types.ts          # Type definitions
└── __tests__/                  # Module tests
    └── [feature].test.ts
```

#### 3. File Naming Rules
- **Files:** kebab-case (e.g., `user-service.ts`, `app-controller.ts`)
- **Classes:** PascalCase (e.g., `UserService`, `AppController`)
- **Interfaces:** PascalCase with `I` prefix (e.g., `IUser`, `IAppConfig`)
- **Types:** PascalCase (e.g., `AppRequest`, `Ownership`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `DEFAULT_PAGE_SIZE`, `CLI_DIR`)
- **Functions:** camelCase (e.g., `generateSlug`, `createUser`)

## Naming Conventions

### Variables & Functions
```typescript
// Variables: camelCase
const userName = "john";
const isActive = true;
const pageSize = 100;

// Functions: camelCase (verb-noun pattern)
function getUserById(id: string) { }
function createNewApp(data: IApp) { }
function validateConfig(config: AppConfig) { }

// Boolean variables: is/has/can prefix
const isValid = true;
const hasPermission = false;
const canDeploy = true;

// Private class members: prefix with underscore (optional)
class MyService {
    private _cache: Map<string, any>;
    private _config: Config;
}
```

### Classes & Interfaces
```typescript
// Classes: PascalCase (noun)
class UserService { }
class AppController { }
class BuildOrchestrator { }

// Interfaces: PascalCase with I prefix
interface IUser { }
interface IWorkspace { }
interface IAppConfig { }

// Type aliases: PascalCase
type AppRequest = Request & { user?: IUser };
type Ownership = { owner?: IUser; workspace?: IWorkspace };

// Enums: PascalCase for enum, UPPER_SNAKE_CASE for values
enum EnvName {
    DEVELOPMENT = "development",
    STAGING = "staging",
    PRODUCTION = "production",
}
```

### Constants & Configuration
```typescript
// Global constants: UPPER_SNAKE_CASE
export const DEFAULT_PAGE_SIZE = 100;
export const MAX_BUILD_TIMEOUT = 1800000; // 30 minutes
export const CLI_DIR = path.resolve(__dirname);

// Configuration objects: camelCase
export const corsOptions = {
    origin: true,
    credentials: true,
};

// Environment variables: UPPER_SNAKE_CASE
process.env.DB_URI
process.env.REDIS_HOST
process.env.CLI_MODE
```

### Database Collections
```typescript
// Collection names: lowercase plural
"users"           // not "Users" or "user"
"workspaces"      // not "Workspace"
"projects"        // not "Project"
"builds"          // not "Build"

// Model registration
model<IUser>("users", userSchema, "users");
```

## TypeScript Standards

### Type Safety
```typescript
// ✅ DO: Use explicit types
function getUser(id: string): Promise<IUser> {
    return userService.findOne({ _id: id });
}

// ❌ DON'T: Use 'any' without reason
function process(data: any) { } // Avoid this

// ✅ DO: Use generic types for flexibility
class BaseService<T> {
    async findOne(filter: IQueryFilter<T>): Promise<T | null> { }
}

// ✅ DO: Use type guards
function isUser(obj: any): obj is IUser {
    return obj && typeof obj.email === "string";
}
```

### Interfaces vs Types
```typescript
// ✅ Use interfaces for object shapes
interface IUser {
    _id: string;
    email: string;
    name: string;
}

// ✅ Use types for unions, intersections, mapped types
type UserOrWorkspace = IUser | IWorkspace;
type Nullable<T> = T | null;
type Readonly<T> = { readonly [P in keyof T]: T[P] };

// ✅ Extend interfaces for inheritance
interface IAdmin extends IUser {
    permissions: string[];
}
```

### Async/Await
```typescript
// ✅ DO: Use async/await for async operations
async function deployApp(appId: string) {
    const app = await appService.findOne({ _id: appId });
    const build = await buildService.create({ app: appId });
    return await deployService.deploy(build);
}

// ❌ DON'T: Mix callbacks with promises
function deployApp(appId: string, callback: Function) {
    appService.findOne({ _id: appId }).then(app => {
        callback(null, app);
    });
}

// ✅ DO: Handle errors properly
try {
    const result = await riskyOperation();
    return result;
} catch (error) {
    logError("Operation failed:", error);
    throw new Error("Failed to complete operation");
}
```

### Null Safety
```typescript
// ✅ DO: Use optional chaining
const userName = user?.profile?.name;

// ✅ DO: Use nullish coalescing
const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

// ✅ DO: Check for null/undefined
if (user && user.email) {
    sendEmail(user.email);
}

// ✅ DO: Use type guards
if (isValidObjectId(id)) {
    const doc = await model.findById(id);
}
```

## Architecture Patterns

### Service Layer Pattern
```typescript
// Base service provides common CRUD operations
export default class BaseService<T = any> {
    readonly model: Model<T>;

    constructor(schema: Schema) {
        this.model = model<T>(collection, schema, collection);
    }

    async findOne(filter: IQueryFilter<T>): Promise<T | null> { }
    async find(filter: IQueryFilter<T>): Promise<T[]> { }
    async create(data: Partial<T>): Promise<T> { }
    async update(filter: IQueryFilter<T>, data: Partial<T>): Promise<T> { }
    async delete(filter: IQueryFilter<T>): Promise<void> { }
}

// Specific services extend BaseService
export class UserService extends BaseService<IUser> {
    constructor() {
        super(userSchema);
    }

    // Add custom business logic
    async findByEmail(email: string): Promise<IUser | null> {
        return this.findOne({ email });
    }
}
```

### Controller Pattern
```typescript
// Controllers handle HTTP requests and delegate to services
export default class BaseController<T extends IBase> {
    service: BaseService<T>;

    async read(): Promise<ResponseData> {
        const data = await this.service.find(this.filter, this.options);
        return respondSuccess({ data });
    }

    async create(inputData: Partial<T>): Promise<ResponseData> {
        const data = await this.service.create(inputData);
        return respondSuccess({ data });
    }
}

// Specific controllers extend BaseController
@Route("api/v1/users")
export class UserController extends BaseController<IUser> {
    constructor() {
        super(new UserService());
    }

    @Post("/")
    async createUser(@Body() body: CreateUserDto): Promise<ResponseData> {
        return this.create(body);
    }
}
```

### Repository Pattern (via Mongoose)
```typescript
// Entity definition with schema
export interface IUser extends IBase {
    email: string;
    name: string;
    password: string;
}

export const userSchema = new Schema<IUser>(
    {
        ...baseSchemaDefinitions,
        email: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        password: { type: String, required: true },
    },
    { collection: "users", timestamps: true }
);
```

### Factory Pattern
```typescript
// Builder factory for Docker/Podman
export class BuilderFactory {
    static create(type: "docker" | "podman"): IBuilder {
        switch (type) {
            case "docker":
                return new DockerBuilder();
            case "podman":
                return new PodmanBuilder();
            default:
                throw new Error(`Unknown builder type: ${type}`);
        }
    }
}
```

### Strategy Pattern
```typescript
// Authentication strategies
export interface IAuthStrategy {
    authenticate(credentials: any): Promise<IUser>;
}

export class GoogleStrategy implements IAuthStrategy {
    async authenticate(token: string): Promise<IUser> {
        // Google OAuth logic
    }
}

export class JWTStrategy implements IAuthStrategy {
    async authenticate(token: string): Promise<IUser> {
        // JWT validation logic
    }
}
```

## Database Standards

### Schema Design
```typescript
// 1. Use IBase interface for common fields
export interface IApp extends IBase {
    name: string;
    project: Types.ObjectId | IProject;
    deployEnvironment: { [key: string]: IDeployEnvironment };
}

// 2. Define schema with type safety
export const appSchema = new Schema<IApp>(
    {
        ...baseSchemaDefinitions,  // Include base fields
        name: { type: String, required: true },
        project: { type: Schema.Types.ObjectId, ref: "projects", required: true },
        deployEnvironment: { type: Object, default: {} },
    },
    {
        collection: "apps",
        timestamps: true,  // Auto createdAt, updatedAt
    }
);

// 3. Add indexes for performance
appSchema.index({ slug: 1 });
appSchema.index({ workspace: 1, project: 1 });
appSchema.index({ owner: 1 });
```

### Query Patterns
```typescript
// ✅ DO: Use filter objects
const users = await userService.find({
    workspace: workspaceId,
    active: true,
    deletedAt: null,
});

// ✅ DO: Use pagination
const { data, total, page, pageSize } = await userService.find(
    { workspace: workspaceId },
    { populate: ["activeRole", "activeWorkspace"] },
    { page: 1, size: 100 }
);

// ✅ DO: Use lean() for read-only operations
const users = await userModel.find({}).lean().exec();

// ✅ DO: Use projection for large documents
const users = await userModel.find({}, { name: 1, email: 1 }).exec();

// ❌ DON'T: Load entire collection without filtering
const allUsers = await userModel.find({}).exec(); // Dangerous!
```

### Soft Delete Pattern
```typescript
// All entities support soft delete via deletedAt field
interface IBase {
    deletedAt?: Date;
}

// Service method
async softDelete(filter: IQueryFilter<T>) {
    return this.model.updateMany(filter, {
        deletedAt: new Date()
    });
}

// Always exclude soft-deleted items in queries
async find(filter: IQueryFilter<T>) {
    filter.$or = [
        { deletedAt: null },
        { deletedAt: { $exists: false } }
    ];
    return this.model.find(filter);
}
```

### Workspace Isolation
```typescript
// Every resource belongs to a workspace
interface IBase {
    workspace: Types.ObjectId | IWorkspace;
    workspaceSlug: string;
}

// Always filter by workspace
async find(filter: IQueryFilter<T>, options: IQueryOptions) {
    if (this.workspace) {
        filter.workspace = this.workspace._id;
    }
    return this.model.find(filter);
}
```

## API Standards

### REST API Design
```typescript
// Resource-based URLs
GET    /api/v1/users              // List users
GET    /api/v1/users/:id          // Get user by ID
POST   /api/v1/users              // Create user
PATCH  /api/v1/users/:id          // Update user
DELETE /api/v1/users/:id          // Delete user

// Nested resources
GET    /api/v1/projects/:id/apps  // List apps in project
POST   /api/v1/projects/:id/apps  // Create app in project

// Actions as sub-resources
POST   /api/v1/builds/:id/deploy  // Deploy a build
POST   /api/v1/apps/:id/rollback  // Rollback an app
```

### Request/Response Format
```typescript
// ✅ Standard response format
interface ResponseData {
    status: 0 | 1;              // 0 = error, 1 = success
    data?: any;
    messages?: string[];
    total?: number;             // For paginated responses
    page?: number;
    pageSize?: number;
}

// Success response
respondSuccess({
    data: users,
    total: 150,
    page: 1,
    pageSize: 100
});

// Error response
respondFailure({
    msg: "User not found"
});

// Multiple messages
respondFailure({
    messages: ["Invalid email", "Password too short"]
});
```

### TSOA Controller Decorators
```typescript
@Route("api/v1/users")
@Tags("User")
export class UserController extends BaseController {

    @Get("/")
    @Security("jwt")
    @SuccessResponse(200, "Success")
    async list(
        @Query() page?: number,
        @Query() size?: number,
        @Query() search?: string,
    ): Promise<ResponseData> {
        // Implementation
    }

    @Post("/")
    @Security("jwt")
    @SuccessResponse(201, "Created")
    async create(@Body() body: CreateUserDto): Promise<ResponseData> {
        // Implementation
    }

    @Patch("/:id")
    @Security("jwt")
    async update(
        @Path() id: string,
        @Body() body: UpdateUserDto,
    ): Promise<ResponseData> {
        // Implementation
    }
}
```

### Input Validation
```typescript
// Use DTOs for request validation
export interface CreateUserDto {
    email: string;
    name: string;
    password: string;
    workspace?: string;
}

// Validate in controller
@Post("/")
async create(@Body() body: CreateUserDto): Promise<ResponseData> {
    if (!body.email) return respondFailure({ msg: "Email is required" });
    if (!isEmail(body.email)) return respondFailure({ msg: "Invalid email" });

    return this.service.create(body);
}
```

### Authentication & Authorization
```typescript
// JWT authentication middleware
@Security("jwt")
async protectedRoute(): Promise<ResponseData> {
    // req.user is available
    const user = this.req.user;
}

// API key authentication
@Security("api_key")
async apiRoute(): Promise<ResponseData> {
    // req.apiKey is available
}

// Role-based authorization
@Security("jwt", ["admin"])
async adminRoute(): Promise<ResponseData> {
    // Only admins can access
}

// Workspace-level authorization
async checkWorkspaceAccess() {
    if (!this.workspace) {
        return respondFailure({ msg: "Unauthorized" });
    }
}
```

## Testing Standards

### Test Organization
```
__tests__/
├── unit/
│   ├── services/
│   │   └── user.service.test.ts
│   └── plugins/
│       └── slug.test.ts
├── integration/
│   ├── api/
│   │   └── user.api.test.ts
│   └── db/
│       └── user.db.test.ts
└── e2e/
    └── deploy.e2e.test.ts
```

### Unit Tests
```typescript
// Use Jest for testing
import { UserService } from "@/services/UserService";

describe("UserService", () => {
    let service: UserService;

    beforeAll(() => {
        service = new UserService();
    });

    describe("findByEmail", () => {
        it("should find user by email", async () => {
            const user = await service.findByEmail("test@example.com");
            expect(user).toBeDefined();
            expect(user.email).toBe("test@example.com");
        });

        it("should return null for non-existent email", async () => {
            const user = await service.findByEmail("nonexistent@example.com");
            expect(user).toBeNull();
        });
    });
});
```

### Integration Tests
```typescript
import request from "supertest";
import { app } from "@/server";

describe("User API", () => {
    let authToken: string;

    beforeAll(async () => {
        // Login and get token
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "test@example.com", password: "password" });
        authToken = res.body.data.token;
    });

    it("should create a new user", async () => {
        const res = await request(app)
            .post("/api/v1/users")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ name: "John", email: "john@example.com" });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe(1);
        expect(res.body.data.email).toBe("john@example.com");
    });
});
```

### Test Coverage
- **Target:** Minimum 80% code coverage
- **Focus:** Critical business logic, API endpoints, utility functions
- **Tools:** Jest with Istanbul/NYC for coverage reports

```bash
# Run tests with coverage
pnpm test --coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Error Handling

### Standard Error Pattern
```typescript
// ✅ DO: Use try-catch for async operations
async function riskyOperation() {
    try {
        const result = await externalAPI();
        return result;
    } catch (error) {
        logError("External API failed:", error);
        throw new Error("Failed to fetch data from external API");
    }
}

// ✅ DO: Handle specific errors
try {
    await userService.create({ email: "duplicate@example.com" });
} catch (error) {
    if (error.code === 11000) {
        return respondFailure({ msg: "Email already exists" });
    }
    throw error;
}

// ✅ DO: Use custom error classes
class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

throw new ValidationError("Invalid input data");
```

### Logging Errors
```typescript
// Use structured logging
import { logError, logWarn, log } from "diginext-utils/dist/xconsole/log";

// Error logging
try {
    await deployApp(appId);
} catch (error) {
    logError("[DEPLOY]", error);

    // Save to database for monitoring
    await SystemLogService.saveError(error, {
        context: "deploy-app",
        appId
    });
}

// Warning logging
if (!cluster.isHealthy) {
    logWarn(`Cluster ${cluster.slug} is unhealthy`);
}

// Info logging
log(`Build ${buildId} completed successfully`);
```

### Fail-Safe Handler
```typescript
// Global error handler middleware
export const failSafeHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    logError("[FAIL_SAFE]", err);

    // Save to database
    SystemLogService.saveError(err, {
        url: req.url,
        method: req.method
    });

    // Respond with error
    res.status(500).json({
        status: 0,
        messages: ["Internal server error"],
    });
};

// Apply in production only
if (IsProd()) {
    app.use(failSafeHandler);
}
```

## Security Standards

### Input Sanitization
```typescript
// ✅ DO: Sanitize user input
import { clearUnicodeCharacters } from "diginext-utils/dist/string";

function sanitizeInput(input: string): string {
    return clearUnicodeCharacters(input).trim();
}

const username = sanitizeInput(req.body.username);
```

### SQL/NoSQL Injection Prevention
```typescript
// ✅ DO: Use parameterized queries
const user = await userModel.findOne({ email: userInput });

// ❌ DON'T: Build queries with string concatenation
const query = `SELECT * FROM users WHERE email = '${userInput}'`; // Vulnerable!

// ✅ DO: Validate ObjectIds
if (!isValidObjectId(userId)) {
    return respondFailure({ msg: "Invalid ID" });
}
```

### Secret Management
```typescript
// ✅ DO: Encrypt sensitive data before storing
import bcrypt from "bcrypt";

const hashedPassword = await bcrypt.hash(password, 10);
user.password = hashedPassword;

// ✅ DO: Never expose secrets in responses
const user = await userService.findOne({ _id: userId });
delete user.password;
return respondSuccess({ data: user });

// ✅ DO: Use environment variables for secrets
const jwtSecret = Config.grab("JWT_SECRET");
```

### Rate Limiting
```typescript
// Apply rate limiting on sensitive endpoints
const rateLimiter = new RateLimiterMongo({
    storeClient: db.connection,
    points: 50,        // 50 requests
    duration: 60,      // per 60 seconds
    blockDuration: 3600, // block for 1 hour
});

app.use("/api/v1/auth", rateLimiterMiddleware);
```

### CORS Configuration
```typescript
// Whitelist allowed origins
const allowedHosts = [
    "localhost:3000",
    "app.dxup.dev",
    "*.dxup.dev",
];

const corsOptions = {
    origin: (origin, callback) => {
        if (allowedHosts.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
};

app.use(cors(corsOptions));
```

## Code Documentation

### JSDoc Comments
```typescript
/**
 * Deploy an application to a Kubernetes cluster
 *
 * @param appId - The application ID
 * @param environment - Target environment (dev, staging, prod)
 * @param options - Deployment options
 * @returns Promise resolving to deployment result
 * @throws {Error} If cluster is unreachable
 *
 * @example
 * ```typescript
 * const result = await deployApp("app-123", "prod", { replicas: 3 });
 * console.log(result.deploymentUrl);
 * ```
 */
async function deployApp(
    appId: string,
    environment: string,
    options?: DeployOptions
): Promise<DeployResult> {
    // Implementation
}
```

### README Files
Each major module should have a README.md:
```markdown
# Module Name

## Purpose
Brief description of what this module does.

## Key Components
- **Component1**: Description
- **Component2**: Description

## Usage Example
```typescript
import { MyService } from "./my-service";

const service = new MyService();
const result = await service.doSomething();
```

## Dependencies
- External dependencies
- Internal module dependencies

## Testing
How to run tests for this module
```

### Inline Comments
```typescript
// ✅ DO: Explain WHY, not WHAT
// Retry up to 3 times because external API is unreliable
const maxRetries = 3;

// ❌ DON'T: State the obvious
// Increment counter by 1
counter++;

// ✅ DO: Document complex logic
// Use exponential backoff to avoid overwhelming the API
const delay = Math.pow(2, attempt) * 1000;

// ✅ DO: Mark TODOs and FIXMEs
// TODO: Implement caching to reduce database queries
// FIXME: Handle edge case when user has no active workspace
```

## Code Review Checklist

Before submitting a PR, ensure:

- [ ] Code follows naming conventions
- [ ] TypeScript types are properly defined
- [ ] No `any` types without justification
- [ ] All async operations use try-catch
- [ ] Input validation is implemented
- [ ] Error handling is comprehensive
- [ ] Secrets are not hardcoded
- [ ] Database queries are optimized
- [ ] API responses follow standard format
- [ ] Tests are written and passing
- [ ] Code is documented with JSDoc
- [ ] No console.logs in production code
- [ ] ESLint and Prettier pass
- [ ] Commit messages follow conventional commits
- [ ] No merge conflicts

## Development Workflow

1. **Create feature branch** from `main` or `prerelease`
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Write code** following standards above

3. **Run linter and formatter**
   ```bash
   pnpm lint
   pnpm format
   ```

4. **Run tests**
   ```bash
   pnpm test
   ```

5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add user authentication"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   ```

7. **Code review** and address feedback

8. **Merge** to target branch after approval

---

**For more information:**
- [Project Overview & PDR](./project-overview-pdr.md)
- [Codebase Summary](./codebase-summary.md)
- [System Architecture](./system-architecture.md)
