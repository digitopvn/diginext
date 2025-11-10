# System Architecture

> **Last Updated:** 2025-11-10
> **Version:** 3.36.2

## Table of Contents
- [High-Level Architecture](#high-level-architecture)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Deployment Architecture](#deployment-architecture)
- [Security Architecture](#security-architecture)
- [Scalability & Performance](#scalability--performance)
- [Integration Points](#integration-points)
- [Infrastructure Requirements](#infrastructure-requirements)

## High-Level Architecture

DXUP follows a multi-tier architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                              │
├─────────────────────────────────────────────────────────────────┤
│  CLI Tool (dx)          │   Admin Web UI         │   CI/CD      │
│  - Command Parser       │   - Next.js Frontend   │   - GitHub   │
│  - API Client           │   - React Components   │   - Bitbucket│
│  - Progress Display     │   - Dashboard          │   - Webhooks │
└────────────┬────────────┴────────────┬───────────┴──────────────┘
             │                         │
             │      HTTPS/WSS          │
             │                         │
┌────────────┴─────────────────────────┴───────────────────────────┐
│                      PRESENTATION TIER                            │
├───────────────────────────────────────────────────────────────────┤
│  Express.js HTTP Server                                          │
│  ├── API Routes (REST)                                           │
│  ├── Authentication (OAuth2, JWT, API Key)                       │
│  ├── Rate Limiting & CORS                                        │
│  ├── Request Validation                                          │
│  └── WebSocket Server (Socket.IO)                                │
└────────────┬──────────────────────────────────────────────────────┘
             │
┌────────────┴──────────────────────────────────────────────────────┐
│                      APPLICATION TIER                             │
├───────────────────────────────────────────────────────────────────┤
│  Controllers (TSOA)                                              │
│  ├── UserController, AppController, BuildController              │
│  ├── ClusterController, DeployController, ...                    │
│  │                                                                │
│  Services (Business Logic)                                       │
│  ├── UserService, AppService, BuildService                       │
│  ├── ClusterService, DeployService, ...                          │
│  │                                                                │
│  Modules (Core Features)                                         │
│  ├── Build Orchestration                                         │
│  ├── Deployment Pipeline                                         │
│  ├── Cluster Management                                          │
│  ├── Database Management                                         │
│  └── Git Integration                                             │
└────────────┬──────────────────────────────────────────────────────┘
             │
┌────────────┴──────────────────────────────────────────────────────┐
│                         DATA TIER                                 │
├───────────────────────────────────────────────────────────────────┤
│  MongoDB (Primary Database)                                      │
│  ├── Users, Workspaces, Projects, Apps                           │
│  ├── Builds, Releases, Deployments                               │
│  ├── Clusters, Providers, Registries                             │
│  │                                                                │
│  Redis (Cache & Pub/Sub)                                         │
│  ├── Session Storage                                             │
│  ├── Rate Limiting                                               │
│  ├── Socket.IO Adapter (Multi-server)                            │
│  └── Build Queue                                                 │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                            │
├───────────────────────────────────────────────────────────────────┤
│  Kubernetes Clusters     │  Cloud Providers      │  Git Providers│
│  - GKE                   │  - GCP                │  - GitHub     │
│  - DOKS                  │  - AWS                │  - Bitbucket  │
│  - Custom K8S            │  - DigitalOcean       │               │
│                          │                       │               │
│  Container Registries    │  Cloud Storage        │  OAuth        │
│  - Docker Hub            │  - GCS                │  - Google     │
│  - GCR                   │  - S3                 │               │
│  - ECR                   │  - DO Spaces          │               │
└───────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. CLI Component (`dx` command)

```
CLI Entry Point (index.ts)
    ├── Command Parser (yargs)
    ├── Authentication Module
    │   ├── Login/Logout
    │   ├── Token Management
    │   └── Server Connection
    ├── Command Handlers
    │   ├── dx new (Create App)
    │   ├── dx init (Initialize App)
    │   ├── dx up (Build & Deploy)
    │   ├── dx build (Build Only)
    │   ├── dx deploy (Deploy Only)
    │   ├── dx down (Takedown)
    │   ├── dx logs (View Logs)
    │   ├── dx cluster (Cluster Management)
    │   ├── dx db (Database Management)
    │   └── ... (Other Commands)
    └── API Client
        ├── HTTP Client (Axios)
        ├── WebSocket Client (Socket.IO)
        └── Progress Streaming
```

**Key Features:**
- Dual-mode operation (client/server)
- Interactive prompts with Inquirer
- Progress indicators with Ora
- Color-coded output with Chalk
- Configuration storage (local)

### 2. Server Component

```
Server Entry Point (server.ts)
    ├── Express App
    │   ├── Body Parser
    │   ├── Cookie Parser
    │   ├── Query Parser
    │   ├── CORS Middleware
    │   ├── Morgan Logger
    │   └── Passport Authentication
    ├── Socket.IO Server
    │   ├── Redis Adapter
    │   ├── Room Management
    │   └── Real-time Events
    ├── Route Registration
    │   ├── /api/v1/* (REST APIs)
    │   ├── /auth/* (OAuth)
    │   └── /api-docs (Swagger)
    ├── Database Connection
    │   └── MongoDB via Mongoose
    └── Startup Scripts
        ├── Connect Git Providers
        ├── Connect Registries
        └── Connect Clusters
```

**Port:** 6969 (configurable via `PORT` env)

### 3. Authentication & Authorization

```
Authentication Flow
    ├── Google OAuth2
    │   ├── /auth/google (Initiate)
    │   ├── /auth/google/callback (Callback)
    │   └── Create JWT Token
    ├── JWT Token
    │   ├── Verify Token
    │   ├── Extract User
    │   └── Attach to Request
    ├── API Key
    │   ├── Verify API Key
    │   ├── Find Service Account
    │   └── Attach to Request
    └── Bearer Token
        ├── Verify Bearer Token
        └── Attach User

Authorization (RBAC)
    ├── Workspace Level
    │   ├── Admin (Full Access)
    │   ├── Moderator (Limited Admin)
    │   └── Member (Read/Write Apps)
    ├── Team Level
    │   └── Team Membership
    └── Resource Level
        ├── Owner Check
        └── Workspace Check
```

**Session Management:**
- JWT tokens with expiration
- Redis-backed session storage
- Cookie-based sessions for web UI
- API key authentication for CI/CD

### 4. Build & Deployment Pipeline

```
Build Request Flow
    ├── 1. Validate Input
    │   ├── Check App Config
    │   ├── Validate Cluster
    │   └── Validate Registry
    ├── 2. Create Build Record
    │   └── Save to MongoDB
    ├── 3. Prepare Source Code
    │   ├── Clone Git Repository
    │   └── Or Use Local Directory
    ├── 4. Container Build
    │   ├── Generate Dockerfile (if needed)
    │   ├── Docker/Podman Build
    │   └── Tag Image
    ├── 5. Push to Registry
    │   ├── Authenticate Registry
    │   └── Push Image
    ├── 6. Generate K8S Manifests
    │   ├── Deployment YAML
    │   ├── Service YAML
    │   ├── Ingress YAML
    │   └── Secret YAML
    ├── 7. Apply to Cluster
    │   ├── Connect to K8S API
    │   ├── Apply Manifests
    │   └── Wait for Rollout
    ├── 8. Health Check
    │   ├── Check Pod Status
    │   ├── Liveness Probe
    │   └── Readiness Probe
    ├── 9. Create Release Record
    │   └── Save to MongoDB
    └── 10. Return Deployment URL
        └── Send to Client

Deployment Strategies
    ├── Rolling Update (Default)
    │   ├── Max Surge: 25%
    │   └── Max Unavailable: 25%
    ├── Blue-Green (Manual)
    │   ├── Deploy to New Env
    │   └── Switch Traffic
    └── Canary (Planned)
        ├── Deploy to Subset
        └── Gradually Increase Traffic
```

**Parallel Processing:**
- Build queue with Redis
- Multiple build workers
- Concurrent deployments to different clusters

### 5. Database Architecture

```
MongoDB Collections
    ├── users
    │   ├── email (unique)
    │   ├── activeWorkspace
    │   └── activeRole
    ├── workspaces
    │   ├── slug (unique)
    │   └── owner
    ├── teams
    │   ├── workspace
    │   └── members[]
    ├── projects
    │   ├── workspace
    │   └── owner
    ├── apps
    │   ├── workspace
    │   ├── project
    │   ├── deployEnvironment{}
    │   └── git{}
    ├── builds
    │   ├── app
    │   ├── workspace
    │   ├── status
    │   └── logs[]
    ├── releases
    │   ├── app
    │   ├── build
    │   ├── deployEnvironment
    │   └── deployment{}
    ├── clusters
    │   ├── workspace
    │   ├── provider
    │   └── kubeconfig
    ├── cloud_providers
    │   ├── workspace
    │   └── credentials
    ├── container_registries
    │   ├── workspace
    │   └── credentials
    ├── cloud_databases
    │   ├── workspace
    │   └── connectionString
    ├── cloud_database_backups
    │   ├── database
    │   └── backupUrl
    ├── cloud_storages
    │   ├── workspace
    │   └── credentials
    ├── git_providers
    │   ├── workspace
    │   └── accessToken
    ├── cronjobs
    │   ├── workspace
    │   ├── schedule
    │   └── command
    ├── webhooks
    │   ├── workspace
    │   └── events[]
    ├── roles
    │   ├── workspace
    │   └── permissions[]
    ├── api_key_accounts
    │   ├── workspace
    │   └── apiKey (hashed)
    ├── service_accounts
    │   ├── workspace
    │   └── role
    ├── routes
    │   └── permissions[]
    ├── frameworks
    │   └── template{}
    ├── media
    │   ├── workspace
    │   └── url
    ├── notifications
    │   ├── user
    │   └── read
    ├── activities
    │   ├── user
    │   └── action
    └── system_logs
        ├── level
        └── error

Indexes
    ├── Unique Indexes
    │   ├── users.email
    │   ├── users.slug
    │   ├── workspaces.slug
    │   └── *.slug (all collections)
    ├── Workspace Indexes
    │   ├── *.workspace
    │   └── *.workspaceSlug
    ├── Owner Indexes
    │   └── *.owner
    ├── Reference Indexes
    │   ├── apps.project
    │   ├── builds.app
    │   └── releases.build
    └── Query Indexes
        ├── *.createdAt
        ├── *.updatedAt
        └── *.deletedAt

Redis Data Structures
    ├── Sessions
    │   └── dxup:session:{sessionId}
    ├── Rate Limiting
    │   └── dxup:ratelimit:{ip}:{endpoint}
    ├── Build Queue
    │   └── dxup:queue:builds
    ├── Socket.IO Rooms
    │   └── dxup:socket:{room}
    └── Cache
        ├── dxup:cache:cluster:{clusterId}
        └── dxup:cache:user:{userId}
```

**Relationships:**
- Workspace → Projects → Apps → Builds → Releases
- User → Active Workspace → Active Role
- Cluster → Cloud Provider
- App → Git Provider, Container Registry

### 6. Kubernetes Integration

```
Kubernetes Operations
    ├── Cluster Connection
    │   ├── Load Kubeconfig
    │   ├── Authenticate
    │   └── Test Connection
    ├── Namespace Management
    │   ├── Create Namespace
    │   ├── Apply Resource Quotas
    │   └── Set Network Policies
    ├── Secret Management
    │   ├── Create Registry Secrets
    │   ├── Create App Secrets
    │   └── Update Secrets
    ├── Deployment Management
    │   ├── Create Deployment
    │   ├── Update Deployment
    │   ├── Scale Deployment
    │   ├── Rollback Deployment
    │   └── Delete Deployment
    ├── Service Management
    │   ├── Create Service
    │   └── Expose Deployment
    ├── Ingress Management
    │   ├── Create Ingress
    │   ├── Configure SSL (cert-manager)
    │   └── Update Domain Rules
    ├── Resource Monitoring
    │   ├── Get Pod Metrics
    │   ├── Get Node Metrics
    │   └── Get Cluster Metrics
    └── Log Streaming
        ├── Pod Logs
        └── Container Logs

Generated K8S Resources
    ├── Namespace
    │   └── {workspace-slug}
    ├── Deployment
    │   ├── name: {app-slug}-{env}
    │   ├── replicas: {config.replicas}
    │   ├── image: {registry}/{app}:{tag}
    │   └── resources: {size}
    ├── Service
    │   ├── name: {app-slug}-{env}
    │   ├── type: ClusterIP
    │   └── port: {config.port}
    ├── Ingress
    │   ├── name: {app-slug}-{env}
    │   ├── host: {domain}
    │   ├── tls: {cert-secret}
    │   └── backend: {service}
    └── Secret
        ├── name: {app-slug}-{env}-env
        └── data: {env-vars}

Container Resource Sizing
    ├── nano: 0.25 CPU, 256Mi RAM
    ├── 0.5x: 0.5 CPU, 512Mi RAM
    ├── 1x: 1 CPU, 1Gi RAM (Default)
    ├── 2x: 2 CPU, 2Gi RAM
    ├── 3x: 3 CPU, 3Gi RAM
    └── 4x: 4 CPU, 4Gi RAM
```

## Data Flow

### User Registration & Login Flow

```
[User] → [Google OAuth] → [Server]
                             ├─→ Create/Find User in MongoDB
                             ├─→ Generate JWT Token
                             ├─→ Store Session in Redis
                             └─→ Return Token + User Data
                                    ↓
[CLI/Web] ← [Token Stored Locally/Cookie]
```

### Application Deployment Flow

```
[Developer] dx up --prod
    ↓
[CLI] Read dx.json config
    ↓
[CLI] Send Build Request → [Server API]
    ↓
[Server] Create Build Record (MongoDB)
    ↓
[Server] Queue Build Job (Redis)
    ↓
[Build Worker]
    ├─→ Clone Git Repo
    ├─→ Build Docker Image
    ├─→ Push to Registry
    ├─→ Generate K8S Manifests
    ├─→ Apply to Cluster
    ├─→ Wait for Rollout
    ├─→ Health Check
    └─→ Create Release (MongoDB)
    ↓
[Socket.IO] Stream Build Logs → [CLI]
    ↓
[CLI] Display Progress & Result
```

### Database Backup Flow

```
[User] dx db backup --prod
    ↓
[Server] Get Database Info (MongoDB)
    ↓
[Server] Connect to Database
    ↓
[Server] Export Data (mongodump/pg_dump/mysqldump)
    ↓
[Server] Compress Archive
    ↓
[Server] Upload to Cloud Storage (GCS/S3)
    ↓
[Server] Create Backup Record (MongoDB)
    ↓
[CLI] Display Success Message
```

### Monitoring Data Flow

```
[K8S Metrics Server]
    ↓
[Server] Poll Metrics Every 30s
    ↓
[Server] Calculate CPU/RAM/Network
    ↓
[Server] Cache in Redis (5min TTL)
    ↓
[Admin UI] Request Metrics → [Server API]
    ↓
[Server] Return Cached Metrics
    ↓
[Admin UI] Display Charts
```

## Deployment Architecture

### Single-Server Deployment (Small Scale)

```
┌─────────────────────────────────────┐
│         Single Server               │
│  ┌───────────────────────────────┐ │
│  │  DXUP Build Server            │ │
│  │  - Express + Socket.IO        │ │
│  │  - Port 6969                  │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │  MongoDB (localhost:27017)    │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │  Redis (localhost:6379)       │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │  Docker/Podman                │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
           ↓ kubectl
    ┌──────────────┐
    │  K8S Cluster │
    └──────────────┘
```

**Use Case:** Personal projects, small teams (<10 users)

### Multi-Server Deployment (Medium Scale)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  DXUP #1    │     │  DXUP #2    │     │  DXUP #3    │
│  (Primary)  │     │  (Worker)   │     │  (Worker)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                     │
       │  ┌────────────────┴────────────────┐   │
       │  │                                  │   │
       └─→│  Redis Cluster (Pub/Sub)        │←──┘
          │  - Socket.IO Adapter             │
          │  - Build Queue                   │
          └──────────────────────────────────┘
                        ↓
          ┌──────────────────────────────────┐
          │  MongoDB Replica Set             │
          │  - Primary + 2 Secondaries       │
          └──────────────────────────────────┘
```

**Use Case:** Medium teams (10-100 users), multiple concurrent builds

### High-Availability Deployment (Large Scale)

```
                 ┌─────────────┐
                 │ Load Balancer│
                 └──────┬───────┘
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────┴────┐     ┌────┴────┐    ┌────┴────┐
   │ DXUP #1 │     │ DXUP #2 │    │ DXUP #3 │
   └────┬────┘     └────┬────┘    └────┬────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
           ┌────────────┴────────────┐
           │                         │
    ┌──────┴──────┐         ┌────────┴────────┐
    │ Redis Cluster│        │ MongoDB Cluster │
    │ (Sentinel)   │        │ (Sharded)       │
    └──────────────┘        └─────────────────┘
```

**Use Case:** Enterprise (100+ users), high availability required

## Security Architecture

### Defense in Depth

```
Layer 1: Network Security
    ├── HTTPS/TLS Encryption
    ├── VPC/Private Networks
    └── Firewall Rules

Layer 2: Application Security
    ├── Authentication
    │   ├── OAuth2 (Google)
    │   ├── JWT Tokens
    │   └── API Keys
    ├── Authorization
    │   ├── RBAC
    │   ├── Workspace Isolation
    │   └── Resource Ownership
    ├── Input Validation
    │   ├── Request Validation
    │   ├── Type Checking
    │   └── Sanitization
    └── Rate Limiting
        └── Per-IP & Per-User

Layer 3: Data Security
    ├── Encryption at Rest
    │   ├── MongoDB Encryption
    │   └── Secret Encryption
    ├── Encryption in Transit
    │   ├── TLS Connections
    │   └── Encrypted API Calls
    └── Access Control
        ├── Database Auth
        └── Least Privilege

Layer 4: Infrastructure Security
    ├── K8S Security
    │   ├── RBAC
    │   ├── Network Policies
    │   ├── Pod Security
    │   └── Secret Management
    └── Cloud Provider Security
        ├── IAM Roles
        ├── Service Accounts
        └── Encrypted Storage
```

### Credential Management

```
Secrets Hierarchy
    ├── Server Secrets (ENV)
    │   ├── JWT_SECRET
    │   ├── DB_URI
    │   ├── REDIS_PASSWORD
    │   └── GOOGLE_CLIENT_SECRET
    ├── Workspace Secrets (MongoDB Encrypted)
    │   ├── Cloud Provider Credentials
    │   ├── Container Registry Credentials
    │   ├── Git Provider Tokens
    │   └── Database Connection Strings
    └── Application Secrets (K8S Secrets)
        ├── Environment Variables
        └── Config Files

Access Control
    ├── Server Access: Environment Variables
    ├── Workspace Admin: Can read (if SHARE_RESOURCE_CREDENTIAL=true)
    ├── Workspace Member: Cannot read
    └── API: Cannot read (unless admin with flag)
```

## Scalability & Performance

### Horizontal Scaling

```
Scalable Components
    ├── DXUP Server
    │   ├── Stateless Design
    │   ├── Redis for Shared State
    │   └── Load Balancer
    ├── MongoDB
    │   ├── Replica Sets
    │   ├── Sharding (Future)
    │   └── Read Replicas
    ├── Redis
    │   ├── Cluster Mode
    │   └── Sentinel
    └── Build Workers
        ├── Queue-Based
        └── Auto-Scaling

Non-Scalable Components
    └── Kubernetes Clusters (per provider limits)
```

### Performance Optimizations

```
Caching Strategy
    ├── Redis Cache
    │   ├── User Sessions (15min TTL)
    │   ├── Cluster Info (5min TTL)
    │   ├── Metrics (5min TTL)
    │   └── API Responses (1min TTL)
    ├── MongoDB Indexes
    │   ├── Unique Indexes on slug
    │   ├── Compound Indexes on workspace + owner
    │   └── Text Indexes on searchable fields
    └── Application Cache
        ├── In-Memory Config Cache
        └── Lazy-Load CLI Commands

Database Optimization
    ├── Connection Pooling
    ├── Lean Queries (read-only)
    ├── Projection (select fields)
    ├── Pagination (limit results)
    └── Aggregation Pipelines

Build Optimization
    ├── Docker Layer Caching
    ├── Parallel Builds
    ├── Build Queue Priority
    └── Registry Caching
```

## Integration Points

### Cloud Provider APIs

```
Google Cloud Platform
    ├── Kubernetes Engine (GKE)
    │   └── @kubernetes/client-node
    ├── Cloud Storage (GCS)
    │   └── @google-cloud/storage
    ├── Service Account Auth
    │   └── google-auth-library
    └── Analytics
        └── @google-analytics/admin

Amazon Web Services
    ├── Elastic Kubernetes Service (EKS) [Planned]
    ├── S3 Storage
    │   └── @aws-sdk/client-s3
    └── IAM Auth
        └── @aws-sdk/types

DigitalOcean
    ├── Kubernetes (DOKS)
    │   └── @kubernetes/client-node
    ├── Spaces (S3-compatible)
    │   └── @aws-sdk/client-s3
    └── REST API
        └── axios + custom client
```

### Git Provider APIs

```
GitHub
    ├── REST API v3
    ├── Authentication (OAuth Apps)
    ├── Repository Management
    ├── Branch Protection
    └── Webhooks

Bitbucket
    ├── REST API 2.0
    ├── Authentication (OAuth)
    ├── Repository Management
    └── Pipelines Integration
```

### Container Registry APIs

```
Docker Hub
    ├── Docker Registry API v2
    ├── Authentication (Token)
    └── Image Push/Pull

Google Container Registry
    ├── GCR API
    ├── Service Account Auth
    └── Image Push/Pull

AWS Elastic Container Registry
    ├── ECR API
    ├── IAM Auth
    └── Image Push/Pull

DigitalOcean Container Registry
    ├── DOCR API
    ├── Token Auth
    └── Image Push/Pull
```

## Infrastructure Requirements

### Minimum Requirements (Development/Small)

```
DXUP Server
    ├── CPU: 2 cores
    ├── RAM: 4 GB
    ├── Disk: 20 GB SSD
    └── OS: Ubuntu 20.04+ / Debian 11+

MongoDB
    ├── CPU: 1 core
    ├── RAM: 2 GB
    └── Disk: 10 GB SSD

Redis
    ├── CPU: 1 core
    ├── RAM: 1 GB
    └── Disk: 5 GB

Kubernetes Cluster
    ├── Nodes: 1+ worker nodes
    ├── CPU: 2+ cores per node
    ├── RAM: 4+ GB per node
    └── Ingress Controller (NGINX/Traefik)
```

### Recommended Requirements (Production)

```
DXUP Server (Load Balanced)
    ├── Instances: 3+
    ├── CPU: 4 cores per instance
    ├── RAM: 8 GB per instance
    ├── Disk: 50 GB SSD per instance
    └── Network: 1 Gbps

MongoDB (Replica Set)
    ├── Instances: 3 (Primary + 2 Secondary)
    ├── CPU: 4 cores per instance
    ├── RAM: 16 GB per instance
    ├── Disk: 500 GB SSD per instance
    └── IOPS: 3000+

Redis (Cluster/Sentinel)
    ├── Instances: 3+
    ├── CPU: 2 cores per instance
    ├── RAM: 8 GB per instance
    ├── Disk: 20 GB SSD
    └── Persistence: AOF + RDB

Kubernetes Cluster
    ├── Nodes: 3+ worker nodes
    ├── CPU: 8+ cores per node
    ├── RAM: 32+ GB per node
    ├── Disk: 100+ GB SSD per node
    ├── Ingress Controller: NGINX with cert-manager
    └── Metrics Server: Enabled
```

### Network Requirements

```
Inbound
    ├── HTTPS (443) - API & Web UI
    ├── HTTP (80) - Redirect to HTTPS
    ├── Custom Port (6969) - Server (if not behind proxy)
    └── WebSocket (443/6969) - Real-time

Outbound
    ├── HTTPS (443)
    │   ├── Cloud Provider APIs
    │   ├── Git Provider APIs
    │   ├── Container Registries
    │   └── OAuth Providers
    ├── Kubernetes API (6443)
    │   └── Cluster API Servers
    └── Database Ports
        ├── MongoDB (27017)
        ├── PostgreSQL (5432)
        └── MySQL (3306)
```

## Disaster Recovery

### Backup Strategy

```
MongoDB Backup
    ├── Frequency: Daily (automated)
    ├── Retention: 30 days
    ├── Method: mongodump
    └── Storage: Cloud Storage (GCS/S3)

Redis Persistence
    ├── RDB Snapshots: Every 1 hour
    ├── AOF: Enabled
    └── Backup: To persistent storage

Application Data
    ├── Git Repositories: External (GitHub/Bitbucket)
    ├── Container Images: Registry (persistent)
    └── User Uploads: Cloud Storage

Configuration
    ├── Infrastructure as Code
    ├── Environment Variables (documented)
    └── Kubernetes Manifests (Git)
```

### Recovery Procedures

```
Server Failure
    ├── Load balancer redirects to healthy instances
    ├── New instance spins up automatically
    └── Connects to shared Redis and MongoDB

Database Failure
    ├── MongoDB Replica Set: Automatic failover
    ├── Redis Sentinel: Automatic failover
    └── Connection pool retries

Cluster Failure
    ├── Deploy to backup cluster
    ├── Update DNS records
    └── Sync state from database

Complete Outage
    ├── Restore MongoDB from backup
    ├── Restore Redis from snapshot
    ├── Redeploy DXUP servers
    └── Reconnect to Kubernetes clusters
```

---

**For more information:**
- [Project Overview & PDR](./project-overview-pdr.md)
- [Codebase Summary](./codebase-summary.md)
- [Code Standards](./code-standards.md)
