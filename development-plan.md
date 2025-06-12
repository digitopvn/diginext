# Development Plan: DigiNext Project (with Prisma)

This document outlines a step-by-step plan to develop the DigiNext project from scratch, utilizing Node.js, TypeScript, Express.js, and Prisma as the primary database ORM.

## Phase 1: Project Setup & Core Infrastructure

1.  **Initialize Project:**
    *   Create a new project directory.
    *   Initialize a Node.js project: `npm init -y` or `yarn init -y`.
    *   Initialize Git repository: `git init`.
    *   Create a `.gitignore` file (e.g., from gitignore.io for Node).

2.  **Install Core Dependencies:**
    *   **Runtime & Framework:** `express`, `cors`
    *   **TypeScript:** `typescript`, `@types/node`, `@types/express`, `@types/cors`, `ts-node`, `nodemon` (for development)
    *   **Configuration:** `dotenv` (for environment variables)
    *   **Validation:** `zod` (for request validation and type safety)
    *   **Logging:** A logging library like `winston` or `pino`.
    *   **Utility:** `lodash`, `uuid`, `module-alias` (if needed, as seen in original dependencies)

3.  **Setup TypeScript:**
    *   Initialize `tsconfig.json`: `npx tsc --init`.
    *   Configure `tsconfig.json` (e.g., `outDir`, `rootDir`, `esModuleInterop`, `strict`, `baseUrl`, `paths` for module aliases).

4.  **Project Structure:**
    *   Create initial directory structure:
        ```
        /
        ├── prisma/
        ├── src/
        │   ├── config/         # Environment variables, constants
        │   ├── controllers/    # Request handlers
        │   ├── dto/            # Data Transfer Objects (using Zod schemas)
        │   ├── entities/       # (Conceptual, Prisma models will be in schema.prisma)
        │   ├── middlewares/    # Express middlewares
        │   ├── modules/        # Feature-specific modules (business logic)
        │   ├── routes/         # API route definitions
        │   ├── services/       # Business logic services
        │   ├── utils/          # Helper functions
        │   ├── app.ts          # Express app configuration
        │   └── server.ts       # Server startup
        ├── .env
        ├── .gitignore
        ├── package.json
        └── tsconfig.json
        ```

5.  **Basic Express Server Setup:**
    *   Create `src/app.ts`: Configure Express app, middlewares (JSON parser, CORS, etc.).
    *   Create `src/server.ts`: Initialize and start the HTTP server.
    *   Add basic "hello world" route for testing.

6.  **Configuration Management:**
    *   Implement `src/config/config.ts` to load environment variables using `dotenv`.
    *   Define essential configurations (port, database URL, JWT secret, etc.).

7.  **Logging Setup:**
    *   Integrate chosen logging library.
    *   Implement a basic logging middleware.

8.  **Global Error Handling:**
    *   Create a global error handling middleware in `src/middlewares/errorHandler.ts`.
    *   Ensure consistent error responses.

## Phase 2: Prisma Setup & Database Schema

1.  **Install Prisma:**
    *   Install Prisma CLI as a dev dependency: `npm install prisma --save-dev` or `yarn add prisma -D`.
    *   Install Prisma Client: `npm install @prisma/client` or `yarn add @prisma/client`.

2.  **Initialize Prisma:**
    *   Run `npx prisma init`. This creates:
        *   `prisma/schema.prisma`: Your main Prisma schema file.
        *   `.env`: Updated with `DATABASE_URL`.
    *   Configure `DATABASE_URL` in `.env` for your chosen database (e.g., PostgreSQL, MySQL, SQLite).

3.  **Define Prisma Schema (`prisma/schema.prisma`):**
    *   Based on the entities identified in the original project (`Activity`, `ApiKeyAccount`, `App`, `Build`, `CloudDatabase`, `User`, `Workspace`, `Project`, `Cluster`, etc.), define corresponding models in `schema.prisma`.
    *   Example for `User` and `Project`:
        ```prisma
        // prisma/schema.prisma
        generator client {
          provider = "prisma-client-js"
        }

        datasource db {
          provider = "postgresql" // Or your chosen DB
          url      = env("DATABASE_URL")
        }

        model User {
          id        String   @id @default(uuid())
          email     String   @unique
          password  String
          name      String?
          roles     Role[]   @relation("UserRoles")
          createdAt DateTime @default(now())
          updatedAt DateTime @updatedAt

          workspaces Workspace[] @relation("UserWorkspaces")
          projects   Project[]   @relation("UserProjects")
          // ... other relations and fields
        }

        model Role {
          id        String   @id @default(uuid())
          name      String   @unique // e.g., ADMIN, USER, EDITOR
          users     User[]   @relation("UserRoles")
          createdAt DateTime @default(now())
          updatedAt DateTime @updatedAt
        }

        model Workspace {
          id          String   @id @default(uuid())
          name        String
          ownerId     String
          owner       User     @relation("UserWorkspaces", fields: [ownerId], references: [id])
          createdAt   DateTime @default(now())
          updatedAt   DateTime @updatedAt
          projects    Project[]
          // ... other fields
        }

        model Project {
          id          String   @id @default(uuid())
          name        String
          workspaceId String
          workspace   Workspace @relation(fields: [workspaceId], references: [id])
          ownerId     String
          owner       User     @relation("UserProjects", fields: [ownerId], references: [id])
          // ... other fields like gitProvider, framework, etc.
          createdAt   DateTime @default(now())
          updatedAt   DateTime @updatedAt
        }

        // Define other models: App, Build, Cluster, Deployment, etc.
        // Ensure all relations (one-to-one, one-to-many, many-to-many) are correctly defined.
        ```
    *   Iteratively define all necessary models and their relationships. Refer to the `src/entities/` directory from the `repomix-output.xml` for a comprehensive list.

4.  **Generate Prisma Client & Run Migrations:**
    *   Generate Prisma Client: `npx prisma generate`. (This is often run automatically after migrations).
    *   Create and apply the initial migration: `npx prisma migrate dev --name initial-setup`.
    *   For subsequent schema changes:
        1.  Modify `schema.prisma`.
        2.  Run `npx prisma migrate dev --name <descriptive-migration-name>`.
        3.  `npx prisma generate` (if not automatic).

5.  **Prisma Client Instance:**
    *   Create a singleton instance of Prisma Client (e.g., `src/db.ts` or `src/prisma.ts`) to be used throughout the application.
        ```typescript
        // src/prisma.ts
        import { PrismaClient } from '@prisma/client';
        const prisma = new PrismaClient();
        export default prisma;
        ```

## Phase 3: Authentication & User Management

1.  **User Service (`src/services/userService.ts`):**
    *   Implement functions for user registration (hashing passwords with `bcrypt`), login, fetching user details, updating profiles, etc., using Prisma Client.
    *   Password hashing: Install `bcrypt` and `@types/bcrypt`.

2.  **Authentication Controller (`src/controllers/authController.ts`):**
    *   Handle `/auth/register`, `/auth/login`, `/auth/me` endpoints.
    *   Use JWT for session management. Install `jsonwebtoken` and `@types/jsonwebtoken`.
    *   Generate JWTs upon successful login.

3.  **Auth Middleware (`src/middlewares/authMiddleware.ts`):**
    *   Verify JWTs from request headers.
    *   Attach user information to the request object for authenticated routes.

4.  **Role-Based Access Control (RBAC):**
    *   Define `Role` model in `schema.prisma` (as shown above).
    *   Seed initial roles (e.g., ADMIN, USER).
    *   Implement `authorizeMiddleware.ts` that checks user roles against required roles for specific routes/actions.

5.  **User Routes (`src/routes/userRoutes.ts`, `src/routes/authRoutes.ts`):**
    *   Define API endpoints for user and auth operations.

## Phase 4: Core Feature Modules Development

This phase involves building out the primary functionalities of the application. For each module:
    *   Finalize related Prisma models.
    *   Create Zod schemas for DTOs (`src/dto/`).
    *   Develop services (`src/services/`) with business logic using Prisma Client.
    *   Develop controllers (`src/controllers/`) to handle API requests, validate input with Zod, and call services.
    *   Define routes (`src/routes/`).

**Key Modules (derived from `repomix-output.xml`):**

1.  **Workspace Management:**
    *   Models: `Workspace`, `WorkspaceMember` (if collaborative).
    *   Service: `WorkspaceService` (CRUD, user invites, etc.).
    *   Controller: `WorkspaceController`.

2.  **Project Management:**
    *   Models: `Project`, `ProjectSettings`, `Framework` (if static list or separate model).
    *   Service: `ProjectService` (CRUD, linking to Git providers, etc.).
    *   Controller: `ProjectController`.

3.  **Application Management:**
    *   Models: `App` (linked to `Project`), `EnvironmentVariable`.
    *   Service: `AppService` (CRUD, managing env vars).
    *   Controller: `AppController`.

4.  **Deployment & Build Management:**
    *   Models: `Build`, `Deployment`, `DeployEnvironment`, `Release`.
    *   Services: `BuildService`, `DeployService`.
    *   Controllers: `BuildController`, `DeployController`.
    *   Integrations: Logic for interacting with Git providers (GitHub, Bitbucket - see `src/modules/git/`), container registries, and deployment targets (clusters).

5.  **Cloud Resource Management:**
    *   **Databases:** `CloudDatabase`, `CloudDatabaseBackup`. Service & Controller.
    *   **Storage:** `CloudStorage`. Service & Controller.
    *   **Providers:** `CloudProvider`. Service & Controller.
    *   **Clusters:** `Cluster`. Service & Controller.

6.  **Git Provider Integration:**
    *   Module: `src/modules/git/`
    *   Models: `GitProvider` (if storing provider details).
    *   Service: `GitService` (API interactions with GitHub, Bitbucket, etc. using libraries like `simple-git` or direct API calls).

7.  **AI Integration (Ask AI):**
    *   Module: `src/modules/ai/`
    *   Service: `AIService` (interfacing with AI models like OpenRouter - `openrouter-api.ts`).
    *   Controller: `AskAiController`.

8.  **API Key Management:**
    *   Models: `ApiKeyAccount`.
    *   Service: `ApiKeyService`.
    *   Controller: `ApiKeyUserController`.
    *   Middleware: `auth-api-key.ts` for API key authentication.

9.  **Cronjobs / Scheduled Tasks:**
    *   Module: `src/modules/cronjob/`
    *   Models: `Cronjob` (if storing job definitions).
    *   Service: `CronjobService` (scheduling and executing tasks using `node-cron` or similar).

10. **Notifications:**
    *   Models: `Notification`.
    *   Service: `NotificationService` (sending email, in-app notifications).

11. **Team Management:**
    *   Models: `Team`, `TeamMember`.
    *   Service: `TeamService`.
    *   Controller: `TeamController`.

12. **System & Monitoring:**
    *   Models: `SystemLog`, `Activity`.
    *   Services: `SystemLogService`, `ActivityService`, `StatsService`.
    *   Controllers: `StatsController`, `MonitorController`.

13. **Other Modules (as per `repomix-output.xml`):**
    *   Domains, Media, Webhooks, etc. Develop these iteratively.

## Phase 5: API Development & Refinement

1.  **Route Organization:**
    *   Structure API routes logically (e.g., `src/routes/api/v1/userRoutes.ts`, `src/routes/api/v1/projectRoutes.ts`).
    *   Create a main router in `src/routes/index.ts` to aggregate all versioned API routes.

2.  **Request Validation:**
    *   Consistently use Zod schemas in controllers for validating request bodies, query params, and path params.
    *   Create a validation middleware or use a library that integrates Zod with Express.

3.  **API Documentation:**
    *   Consider using `tsoa` (present in original dependencies) for generating OpenAPI specs from TypeScript code, or manually create/maintain an OpenAPI (Swagger) definition.
    *   Setup `swagger-ui-express` to serve the API documentation.

4.  **Rate Limiting & Security Headers:**
    *   Implement rate limiting (e.g., `rate-limiter-flexible`).
    *   Add security-related HTTP headers (e.g., using `helmet`).

## Phase 6: Background Services & CLI (If Applicable)

1.  **Background Job Processing:**
    *   If tasks are long-running or need to be processed asynchronously (beyond simple cron jobs), consider a message queue system (e.g., Redis with BullMQ).

2.  **CLI Tool Development:**
    *   The `src/modules/cli/` directory in `repomix-output.xml` suggests a CLI.
    *   Use libraries like `yargs` or `commander.js` to build the CLI.
    *   The CLI might interact with the main API or directly with services.

## Phase 7: Testing

1.  **Setup Testing Framework:**
    *   Use Jest (present in original devDependencies). Configure it for TypeScript projects (`ts-jest`).
    *   Setup scripts in `package.json` for running tests.

2.  **Unit Tests:**
    *   Write unit tests for services, utility functions, and complex logic within controllers.
    *   Mock Prisma Client and other external dependencies where necessary.

3.  **Integration Tests:**
    *   Test interactions between different parts of the application (e.g., controller-service-database).
    *   Use a test database and libraries like `supertest` for API endpoint testing.
    *   Ensure Prisma migrations are handled correctly in the test environment.

4.  **End-to-End Tests (Optional but Recommended):**
    *   Test complete user flows.

## Phase 8: Deployment Considerations

1.  **Dockerfile:**
    *   Create a multi-stage `Dockerfile` for building and running the application in a container.

2.  **CI/CD Pipeline:**
    *   Set up a CI/CD pipeline (e.g., GitHub Actions, as seen in `.github/workflows/`).
    *   Pipeline steps: linting, testing, building Docker image, pushing to a registry, deploying.

3.  **Database Migrations in Production:**
    *   Ensure `prisma migrate deploy` is run as part of the deployment process.

4.  **Environment Configuration:**
    *   Manage environment-specific configurations securely (e.g., using secrets management tools provided by cloud providers or Kubernetes).

5.  **Process Management:**
    *   Use a process manager like PM2 if not deploying in a container orchestrator like Kubernetes.

## Phase 9: Documentation & Maintenance

1.  **Code Comments:**
    *   Write JSDoc/TSDoc comments for functions, classes, and complex code sections.

2.  **README.md:**
    *   Update/create a comprehensive `README.md` with setup instructions, project overview, API documentation links, and contribution guidelines.

3.  **Ongoing Maintenance:**
    *   Regularly update dependencies.
    *   Monitor application performance and errors.
    *   Refactor code as needed.

## Data Migration (If transitioning from an existing system)

While this plan focuses on "from scratch" development, if there's existing data in a MongoDB (Mongoose) system:
1.  **Schema Mapping:** Carefully map existing Mongoose schemas to the new Prisma schema.
2.  **Migration Scripts:** Write custom scripts (Node.js with Mongoose and Prisma Client) to extract data from MongoDB, transform it as needed, and load it into the new Prisma-managed database.
3.  **Data Validation:** Thoroughly validate migrated data.
4.  **Downtime Planning:** Plan for potential downtime during the migration process or implement a phased migration strategy.

This development plan provides a structured approach. Each phase and step can be broken down further into smaller tasks. Regular code reviews, agile practices, and iterative development are recommended.
