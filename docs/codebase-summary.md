# Codebase Summary

> **Last Updated:** 2025-11-10
> **Version:** 3.36.2
> **Generated from:** repomix-output.xml

## Overview

DXUP (Diginext) is a comprehensive build server and CLI platform that abstracts Kubernetes complexity, enabling developers to deploy applications to any Kubernetes cluster without deep K8S knowledge. The codebase consists of both CLI tools and a server component with a full-featured web admin interface.

## Repository Statistics

- **Total Files:** 627 files
- **Total Tokens:** 2,584,502 tokens
- **Total Characters:** 6,734,732 chars
- **Main Language:** TypeScript
- **Package Manager:** pnpm (with support for npm/yarn)

## Technology Stack

### Core Technologies
- **Runtime:** Node.js (>=16.0.0)
- **Language:** TypeScript 4.9.5
- **Backend Framework:** Express.js
- **Database:** MongoDB (Mongoose ORM)
- **Cache/Queue:** Redis with ioredis
- **Real-time:** Socket.IO 4.1.3
- **Authentication:** Passport.js (Google OAuth2, JWT)
- **API Documentation:** TSOA + Swagger UI

### Container & Orchestration
- **Container Builders:** Docker, Podman
- **Orchestration:** Kubernetes via @kubernetes/client-node
- **Container Registries:** Docker Hub, GCR, AWS ECR, DigitalOcean Registry

### Cloud Providers
- **Google Cloud Platform:** @google-cloud/storage, Google Auth Library
- **AWS:** @aws-sdk/client-s3, @aws-sdk/lib-storage
- **DigitalOcean:** Custom API integration

### Development Tools
- **Build System:** tsc + tsc-alias
- **Testing:** Jest 29.5.0
- **Linting:** ESLint + Prettier
- **Git Hooks:** Husky 8.0.0
- **Semantic Versioning:** semantic-release
- **Process Manager:** PM2

## Directory Structure

```
/mnt/d/www/diginext/
├── src/                          # Source code
│   ├── app.config.ts            # Application configuration
│   ├── index.ts                 # CLI entry point
│   ├── server.ts                # Server entry point
│   ├── build/                   # Build system utilities
│   ├── config/                  # Configuration files
│   ├── controllers/             # API controllers (TSOA)
│   ├── entities/                # MongoDB schemas (Mongoose)
│   ├── interfaces/              # TypeScript interfaces
│   ├── middlewares/             # Express middlewares
│   ├── migration/               # Database migrations
│   ├── modules/                 # Core business logic modules
│   │   ├── ai/                  # AI integration (OpenRouter)
│   │   ├── analytics/           # Google Analytics integration
│   │   ├── api/                 # API utilities
│   │   ├── apps/                # Application management
│   │   ├── bitbucket/           # Bitbucket integration
│   │   ├── build/               # Build orchestration
│   │   ├── builder/             # Docker/Podman builders
│   │   ├── capture/             # Screenshot/PDF export
│   │   ├── cdn/                 # CDN management
│   │   ├── cli/                 # CLI utilities
│   │   ├── cluster/             # K8S cluster management
│   │   ├── cronjob/             # Cron job scheduling
│   │   ├── db/                  # Database utilities
│   │   ├── deploy/              # Deployment orchestration
│   │   ├── diginext/            # DXUP API client
│   │   ├── domains/             # Domain management
│   │   ├── frameworks/          # Framework templates
│   │   ├── git/                 # Git provider integrations
│   │   ├── k8s/                 # Kubernetes utilities
│   │   ├── passports/           # Authentication strategies
│   │   ├── pipeline/            # CI/CD pipelines
│   │   ├── project/             # Project management
│   │   ├── providers/           # Cloud provider integrations
│   │   ├── registry/            # Container registry management
│   │   ├── server/              # Server startup scripts
│   │   ├── snippets/            # Code snippet generators
│   │   ├── storages/            # Cloud storage integrations
│   │   └── workspace/           # Workspace management
│   ├── plugins/                 # Utility plugins
│   ├── routes/                  # API routes
│   │   ├── api/v1/             # REST API v1 endpoints
│   │   └── auth/               # Authentication routes
│   ├── seeds/                   # Database seeders
│   ├── services/                # Business logic services
│   └── views/                   # Server-rendered views
├── public/                       # Static files (Next.js admin UI)
├── templates/                    # Framework templates
├── binaries/                     # Binary dependencies
├── scripts/                      # Deployment scripts
├── docs/                         # Documentation
├── __tests__/                    # Test suites
├── .claude/                      # Claude AI workflows
├── .github/                      # GitHub Actions
├── .vscode/                      # VS Code settings
└── plans/                        # Development plans

```

## Core Modules

### 1. Build & Deployment (`src/modules/build/`, `src/modules/deploy/`)
- Build orchestration and container image building
- Deployment to Kubernetes clusters
- Rollout strategies and zero-downtime deployments
- Build status tracking and logging
- Release management and versioning

### 2. Cluster Management (`src/modules/cluster/`, `src/modules/k8s/`)
- Kubernetes cluster connection and authentication
- Namespace, deployment, service, ingress management
- Resource monitoring (CPU, RAM, network)
- Health checks and readiness probes
- kubectl CLI wrapper

### 3. Application Management (`src/modules/apps/`)
- Application initialization and configuration
- Environment-specific settings (dev, staging, prod)
- Deploy environment management
- Application logs streaming
- App directory structure management

### 4. Git Integration (`src/modules/git/`, `src/modules/bitbucket/`)
- GitHub and Bitbucket provider support
- Repository management (create, clone, push)
- Branch protection and settings
- SSH key generation and management
- Pull request creation

### 5. Container Registry (`src/modules/registry/`)
- Multi-registry support (Docker Hub, GCR, ECR, DOCR)
- Image push/pull operations
- Registry secret management in K8S
- Authentication handling

### 6. Database Management (`src/modules/db/`)
- PostgreSQL, MySQL, MongoDB support
- Database backup and restore
- Cloud database provisioning
- Connection management

### 7. Cloud Storage (`src/modules/storages/`)
- Google Cloud Storage integration
- AWS S3 integration
- DigitalOcean Spaces support
- File upload/download operations

### 8. Authentication (`src/modules/passports/`)
- Google OAuth2 strategy
- JWT token-based authentication
- Bearer token authentication
- Service account authentication
- Role-based access control (RBAC)

### 9. API Layer (`src/controllers/`, `src/services/`)
- RESTful API endpoints with TSOA
- Service-oriented architecture
- Request/response validation
- Rate limiting and security
- Swagger documentation

### 10. CLI Interface (`src/index.ts`, CLI commands)
- Command-line interface for all operations
- Interactive prompts with inquirer
- Progress indicators and logging
- Configuration management
- Auto-update mechanism

## Entity Models (MongoDB/Mongoose)

### Core Entities
- **User** - User accounts and profiles
- **Workspace** - Tenant/organization workspaces
- **Team** - User teams within workspaces
- **Role** - RBAC role definitions
- **ApiKeyAccount** - API key authentication
- **ServiceAccount** - Service account management

### Project & Application
- **Project** - Project containers
- **App** - Applications within projects
- **Framework** - Framework templates (Next.js, Nest.js, etc.)
- **Build** - Build records and logs
- **Release** - Release versions and deployments
- **DeployEnvironment** - Environment configurations

### Infrastructure
- **Cluster** - Kubernetes cluster connections
- **CloudProvider** - Cloud provider credentials
- **ContainerRegistry** - Container registry connections
- **CloudDatabase** - Database instances
- **CloudDatabaseBackup** - Database backups
- **CloudStorage** - Cloud storage buckets

### Utilities
- **GitProvider** - Git provider integrations
- **Cronjob** - Scheduled job definitions
- **Webhook** - Webhook configurations
- **Route** - API route permissions
- **Media** - Media file metadata
- **Notification** - User notifications
- **Activity** - Activity logs
- **SystemLog** - System error logs
- **UserToken** - User session tokens

## Service Layer Architecture

Each entity has a corresponding service class extending `BaseService`:

```
BaseService (abstract)
├── UserService
├── WorkspaceService
├── TeamService
├── ProjectService
├── AppService
├── BuildService
├── ReleaseService
├── ClusterService
├── CloudProviderService
├── ContainerRegistryService
├── CloudDatabaseService
├── CloudStorageService
├── GitProviderService
├── CronjobService
├── FrameworkService
├── RoleService
├── ApiKeyUserService
├── ServiceAccountService
├── WebhookService
├── RouteService
├── MediaService
├── NotificationService
├── ActivityService
├── SystemLogService
└── AIService
```

## API Architecture

### REST API Structure
```
/api/v1/
├── auth                    # Authentication endpoints
├── user                    # User management
├── workspace               # Workspace operations
├── team                    # Team management
├── project                 # Project operations
├── app                     # Application management
├── build                   # Build operations
├── deploy                  # Deployment operations
├── release                 # Release management
├── cluster                 # Cluster management
├── provider                # Cloud provider operations
├── registry                # Container registry operations
├── database                # Database management
├── database-backup         # Database backup operations
├── storage                 # Cloud storage operations
├── git                     # Git provider operations
├── cronjob                 # Cron job management
├── framework               # Framework templates
├── domain                  # Domain management
├── monitor                 # Resource monitoring
├── webhook                 # Webhook management
├── role                    # Role management
├── service_account         # Service account operations
├── api_key                 # API key management
├── media                   # Media file operations
├── notification            # Notification management
├── ask-ai                  # AI assistant
├── stats                   # Statistics and metrics
├── utility                 # Utility endpoints
└── route                   # Route management
```

## CLI Commands

### Main Commands
```bash
dx login [url]              # Authenticate with DXUP workspace
dx logout                   # Logout from workspace
dx profile                  # Show user profile
dx info                     # Show CLI information
dx update                   # Update CLI to latest version

# Application Management
dx new                      # Create new app from template
dx init                     # Initialize app in current directory
dx up [--env]              # Build and deploy app
dx build                    # Build container image
dx deploy                   # Deploy to cluster
dx down                     # Take down deployment
dx logs [--env]            # View application logs

# Infrastructure
dx cluster [cmd]            # Manage K8S clusters
dx db [cmd]                # Manage databases
dx registry [cmd]          # Manage container registries
dx domain [cmd]            # Manage domains
dx cdn [cmd]               # Manage CDN/storage

# Cloud Providers
dx gcloud [cmd]            # Google Cloud operations
dx digitalocean [cmd]      # DigitalOcean operations
dx custom [cmd]            # Custom provider operations

# Development
dx git [cmd]               # Git operations
dx kubectl [cmd]           # kubectl wrapper
dx pipeline [cmd]          # CI/CD pipeline management
dx cronjob [cmd]           # Cron job management
dx dotenv [cmd]            # Environment variable management

# Utilities
dx ask [question]          # AI assistant
dx config [cmd]            # Configuration management
dx analytics [cmd]         # Analytics operations
dx server [cmd]            # Server management
dx snippets [cmd]          # Code snippet generation
```

## Build & Deployment Flow

1. **CLI Request** → User runs `dx up` command
2. **Authentication** → CLI authenticates with DXUP server
3. **App Configuration** → CLI reads `dx.json` or prompts for config
4. **Source Upload** → CLI uploads source code to server
5. **Build Process** → Server builds container image (Docker/Podman)
6. **Registry Push** → Image pushed to container registry
7. **K8S Deployment** → YAML manifests generated and applied
8. **Ingress Setup** → Domain/SSL configuration
9. **Health Check** → Wait for pods to be ready
10. **Completion** → Return deployment URL and status

## Configuration Files

### Application Config (`dx.json`)
```json
{
  "name": "app-name",
  "project": "project-slug",
  "framework": "nextjs",
  "git": { "provider": "github", "repoURL": "..." },
  "deployEnvironment": {
    "dev": { "domains": [...], "size": "1x", "replicas": 1 },
    "prod": { "domains": [...], "size": "2x", "replicas": 3 }
  }
}
```

### Environment Variables (`.env`)
```bash
# Database
DB_URI=mongodb://...
DB_NAME=diginext

# Server
PORT=6969
BASE_URL=https://app.dxup.dev
CLI_MODE=server

# Builder
BUILDER=podman  # or docker

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Key Features Implementation

### 1. Zero-Downtime Deployment
- Kubernetes rolling update strategy
- Health check probes (liveness, readiness)
- Graceful shutdown handling
- Multiple replica management

### 2. Multi-Cluster Support
- Cluster connection pooling
- Context switching via kubeconfig
- Cluster health monitoring
- Cross-cluster deployment

### 3. Database Backup/Restore
- Automated scheduled backups
- Point-in-time recovery
- Cross-region backup storage
- Backup encryption

### 4. Domain & SSL Management
- Automatic SSL certificate generation (Let's Encrypt)
- DNS record management
- Ingress controller integration
- Domain verification

### 5. Resource Monitoring
- CPU, RAM, Network metrics
- Per-deployment monitoring
- Per-node monitoring
- Per-cluster monitoring
- Prometheus integration

### 6. CI/CD Integration
- GitHub Actions support
- Bitbucket Pipelines integration
- Webhook-based deployments
- Build status notifications

### 7. Role-Based Access Control
- Workspace-level permissions
- Team-based access
- Resource-level permissions
- API key authentication

## Testing Structure

Tests are organized in `__tests__/` directory:
- Unit tests for services
- Integration tests for API endpoints
- E2E tests for CLI commands
- Kubernetes integration tests

Test runner: Jest with ts-jest
Coverage tools: Istanbul/NYC

## Build Scripts

### Development
```bash
pnpm dev              # Start server in dev mode
pnpm dev:server       # Start server with ts-node-dev
pnpm dev:nodemon      # Start with nodemon
```

### Production
```bash
pnpm build            # Build TypeScript to dist/
pnpm start:js         # Start from compiled JS
pnpm serve            # Start with PM2
```

### Testing
```bash
pnpm test             # Run all tests
pnpm coverage         # Run tests with coverage
pnpm lint             # Lint and type-check
```

### Deployment
```bash
pnpm docker-build     # Build Docker image
pnpm release          # Semantic release
pnpm deploy           # Deploy with Skaffold
```

## Entry Points

### CLI Mode
- **Entry:** `src/index.ts`
- **Process:** Parse CLI args → Execute command → Exit
- **Binary:** `dist/index.js` (executable via `dx` or `di`)

### Server Mode
- **Entry:** `src/server.ts`
- **Process:** Connect DB → Initialize Express → Start HTTP server
- **Port:** Default 6969 (configurable via `PORT` env var)

## External Dependencies

### Required Services
- MongoDB (primary database)
- Redis (caching, pub/sub, rate limiting)
- Kubernetes cluster (deployment target)
- Container registry (image storage)

### Optional Services
- Cloud provider accounts (GCP, AWS, DigitalOcean)
- Git provider (GitHub, Bitbucket)
- Domain registrar (for DNS management)
- SSL certificate provider (Let's Encrypt via cert-manager)

## Performance Considerations

- Socket.IO with Redis adapter for horizontal scaling
- MongoDB connection pooling
- Rate limiting on authentication endpoints
- Kubernetes API request batching
- Lazy loading of CLI commands
- Progress streaming for long operations
- Concurrent build processing
- Image layer caching

## Security Features

- JWT token authentication
- API key authentication
- OAuth2 integration
- Rate limiting
- CORS configuration
- Secret encryption in database
- SSH key management
- Registry credential handling
- Service account isolation
- Workspace-level data isolation

## Monitoring & Logging

- Morgan HTTP request logging
- System error logging to database
- Activity logging for audit trails
- Build logs streaming via Socket.IO
- Kubernetes event monitoring
- Resource usage tracking
- Performance metrics collection

## Extensibility Points

1. **Framework Templates** - Add new frameworks in `templates/`
2. **Cloud Providers** - Implement provider interface in `src/modules/providers/`
3. **Container Builders** - Extend builder interface in `src/modules/builder/`
4. **Git Providers** - Add provider in `src/modules/git/`
5. **Authentication Strategies** - Add Passport.js strategy in `src/modules/passports/`
6. **API Endpoints** - Add controllers and routes in `src/controllers/`, `src/routes/`
7. **CLI Commands** - Add command handler in `src/index.ts`
8. **Middlewares** - Add Express middleware in `src/middlewares/`

## Related Repositories

- **Admin UI:** https://github.com/digitopvn/diginext-admin (Next.js frontend)
- **Documentation:** https://docs.dxup.dev
- **Website:** https://dxup.dev

## Migration & Seeding

Database migrations are located in `src/migration/`:
- Schema migrations
- Data migrations
- Index migrations
- Relationship migrations

Database seeders are located in `src/seeds/`:
- Initial roles
- Default frameworks
- System routes
- Sample data

## Development Workflow

1. Clone repository
2. Install dependencies: `pnpm install`
3. Create `.env.dev` from `.env.example`
4. Start MongoDB and Redis
5. Run migrations: `pnpm migrate`
6. Seed database: `pnpm seed`
7. Start development server: `pnpm dev`
8. Make changes and test
9. Run tests: `pnpm test`
10. Build: `pnpm build`
11. Create PR with semantic commit messages

## Commit Convention

Uses conventional commits for semantic versioning:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test updates
- `chore:` - Build/tooling changes

## Deployment Targets

- **Development:** Local cluster (k3s, microk8s, Docker Desktop)
- **Staging:** Cloud K8S cluster (GKE, DOKS, EKS)
- **Production:** Multi-region K8S clusters
- **Edge:** Edge clusters for low-latency regions

## Notable Design Patterns

1. **Service Layer Pattern** - Business logic separated from controllers
2. **Repository Pattern** - Data access abstraction via Mongoose models
3. **Strategy Pattern** - Authentication strategies, build strategies
4. **Factory Pattern** - Builder factory (Docker/Podman)
5. **Observer Pattern** - Socket.IO event emitters
6. **Middleware Pattern** - Express middleware chain
7. **Command Pattern** - CLI command handlers
8. **Singleton Pattern** - Database connection, configuration

## Code Quality Tools

- **TypeScript** - Static type checking
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting
- **commitlint** - Commit message linting
- **Jest** - Unit/integration testing
- **Semantic Release** - Automated versioning

## Documentation Standards

- JSDoc comments for public APIs
- README files in module directories
- Swagger/OpenAPI documentation for REST APIs
- CLI help text for commands
- Architecture Decision Records (ADRs)

---

**For detailed architecture and development guidelines, see:**
- [Project Overview & PDR](./project-overview-pdr.md)
- [Code Standards](./code-standards.md)
- [System Architecture](./system-architecture.md)
