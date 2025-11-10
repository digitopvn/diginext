# DXUP

### **A developer-focused platform for app deployment & centralized cloud resource management.**

[![Version](https://img.shields.io/npm/v/@topgroup/diginext)](https://www.npmjs.com/package/@topgroup/diginext)
[![License](https://img.shields.io/github/license/digitopvn/diginext)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Discord](https://img.shields.io/discord/YOUR_DISCORD_ID?label=discord)](https://discord.gg/xMuW5pN2Kn)

**https://dxup.dev**

*Focus on building your apps, shipping fast, and shining, and leave your cloud infrastructure to DXUP.*

> `dx` also means **Developer Experience**, and this is my number one goal - create the best experience for developers - let's make coding great again.

<p align="center">
  <img src="dx-banner.png?raw=true" alt="DXUP Build Server & CLI">
</p>

## Why DXUP?

Developers should not be frustrated by deploying apps to infrastructure, or bothering DevOps engineers for help. They should fully focus on developing apps without needing to understand servers, domains, or infrastructure details.

DXUP strips away Kubernetes complexity, providing a **Vercel-like deployment experience** for self-hosted and multi-cloud environments.

## Key Features

### 🚀 Simple Deployment
- **One-command deploy** to any Kubernetes cluster
- **Zero-downtime** rolling updates with health checks
- **Instant rollback** to previous versions
- **Custom domains** with automatic SSL certificates

### ☁️ Multi-Cloud Support
- ✅ Google Cloud Platform (GKE)
- ✅ DigitalOcean Kubernetes (DOKS)
- ✅ Bare-metal & custom Kubernetes clusters
- 🔜 AWS (EKS)
- 🔜 Azure (AKS)

### 🗄️ Database Management
- Auto-provision PostgreSQL, MySQL, MongoDB
- Automated backups & point-in-time restore
- Connection string management

### 📦 Storage Integration
- Google Cloud Storage
- AWS S3
- DigitalOcean Spaces
- CDN integration

### 🔧 Developer Tools
- Framework templates (Next.js, Nest.js, Bun, Express, Static)
- Git integration (GitHub, Bitbucket)
- Environment variable management
- Real-time log streaming
- AI-assisted troubleshooting

### 📊 Monitoring & Management
- CPU, RAM, Network usage per deployment
- Node & cluster-wide metrics
- Deployment history & rollbacks
- Cron jobs & automation
- Team collaboration with RBAC

## Quick Start

### Installation

Install the CLI globally:

```bash
npm install -g @topgroup/diginext
```

### Deploy Your First App

```bash
# Login to DXUP workspace
dx login

# Navigate to your project
cd /path/to/your/app

# Initialize DXUP in your project
dx init

# Deploy to development
dx up

# Deploy to production
dx up --prod
```

That's it! Your app is now live on Kubernetes.

### Create New App from Template

```bash
dx new
```

Choose from available frameworks:
- Next.js (App Router / Pages Router)
- Nest.js
- Bun.js Starter
- Express.js Starter
- Static website with NGINX

## Advanced Usage

### Multi-Environment Deployment

```bash
# Deploy to specific environments
dx up --dev
dx up --staging
dx up --prod

# Custom configuration
dx up --prod --replicas=3 --size=2x --domain=myapp.com
```

### Database Operations

```bash
# Backup database
dx db backup --prod

# Restore from backup
dx db restore --staging --backup-id=<id>

# List backups
dx db backup list
```

### Cluster Management

```bash
# Connect to cluster
dx cluster connect --gke

# List clusters
dx cluster list

# Monitor cluster
dx cluster monitor
```

## Self-Hosting

### Quick Install (Recommended)

SSH into your server and run:

```bash
curl -sfL https://dxup.dev/install/microk8s | sh -
```

[Detailed installation guide →](https://dev.to/mrgoonie/i-turn-my-companys-pc-into-my-own-vercel-like-platform-351o)

### Docker Compose

1. Clone the repository
2. Copy `docker-compose.example.yaml` to `docker-compose.yaml`
3. Set environment variables (Google OAuth credentials)
4. Run: `docker compose up`
5. Access admin panel at `http://localhost:6969`

See [docs](https://docs.dxup.dev) for detailed setup instructions.

## Documentation

### For Users
- 📚 [Official Documentation](https://docs.dxup.dev)
- 🎥 [Demo Video](https://www.youtube.com/watch?v=Q2jJ555Mc2k)
- 📖 [Getting Started Guide](https://docs.dxup.dev/getting-started)
- 💡 [CLI Command Reference](https://docs.dxup.dev/cli)

### For Developers
- 🏗️ [Project Overview & Product Requirements](docs/project-overview-pdr.md)
- 📦 [Codebase Summary](docs/codebase-summary.md)
- 📏 [Code Standards & Best Practices](docs/code-standards.md)
- 🏛️ [System Architecture](docs/system-architecture.md)
- 🤝 [Contributing Guide](CONTRIBUTING.md)
- 📝 [Changelog](CHANGELOG.md)

### Resources
- [Kubernetes for the poor](https://dev.to/mrgoonie/kubernetes-for-the-poor-2ne)
- [I turn my company's PC into my own "Vercel-like" platform](https://dev.to/mrgoonie/i-turn-my-companys-pc-into-my-own-vercel-like-platform-351o)
- [Developer-First Platforms - Overcoming K8S Complexity](https://dev.to/mrgoonie/developer-first-platforms-overcoming-k8s-complexity-1lf9)

## Who Should Use DXUP?

### ✅ For Developers
- Deploy apps without Kubernetes knowledge
- Self-service deployment independence
- Enhanced workflows with helpful commands
- Quick project starts with framework templates

### ✅ For DevOps Engineers
- Centralized multi-cluster management
- Reduced repetitive deployment tasks
- Team self-service with maintained control
- Infrastructure monitoring & automation

### ✅ For Tech Leads & Managers
- Project oversight & visibility
- Resource allocation tracking
- Cost monitoring & optimization
- Better team productivity insights

### ✅ For Startups & Companies
- "Kubernetes for the poor" - affordable K8S
- Self-hosted Vercel alternative
- No vendor lock-in
- Full infrastructure control

## Architecture

DXUP consists of three main components:

1. **CLI Tool (`dx`)** - Command-line interface for developers
2. **Build Server** - Orchestrates builds, deployments, and infrastructure
3. **Admin Web UI** - Next.js dashboard for visual management

[View detailed architecture →](docs/system-architecture.md)

## Technology Stack

- **Backend:** Node.js, TypeScript, Express.js
- **Database:** MongoDB (Mongoose ORM)
- **Cache:** Redis (with Socket.IO adapter)
- **Orchestration:** Kubernetes (via @kubernetes/client-node)
- **Containers:** Docker, Podman
- **Authentication:** Passport.js (OAuth2, JWT, API Keys)
- **API:** TSOA + Swagger documentation

[View complete tech stack →](docs/codebase-summary.md)

## Contributing

We welcome contributions! Here's how to get started:

1. Read our [Contributing Guide](CONTRIBUTING.md)
2. Check out [Code Standards](docs/code-standards.md)
3. Review [System Architecture](docs/system-architecture.md)
4. Fork the repository
5. Create a feature branch
6. Submit a pull request

### Development Setup

```bash
# Clone repository
git clone https://github.com/digitopvn/diginext.git
cd diginext

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.dev

# Start development server
pnpm dev

# Run tests
pnpm test

# Build
pnpm build
```

See [Code Standards](docs/code-standards.md) for detailed development guidelines.

## Roadmap

- ✅ Core platform with GKE & DOKS support
- ✅ Zero-downtime deployments
- ✅ Database backup & restore
- ✅ Custom domains & SSL
- 🔄 AWS EKS support (In Progress)
- 🔄 Azure AKS support (In Progress)
- 🔜 Multi-region deployments
- 🔜 Advanced RBAC
- 🔜 Marketplace for extensions

[Full roadmap →](https://topgroup.notion.site/Roadmap-6a8266c2929c48ad8d4c11c954e9d852)

## Community & Support

- 💬 [Discord Community](https://discord.gg/xMuW5pN2Kn)
- 📝 [GitHub Issues](https://github.com/digitopvn/diginext/issues)
- 📚 [Documentation](https://docs.dxup.dev)
- 🌐 [Official Website](https://dxup.dev)
- 🎮 [Official Workspace](https://app.dxup.dev)

## Related Projects

- **Admin UI:** [diginext-admin](https://github.com/digitopvn/diginext-admin) - Next.js frontend
- **Documentation:** [docs.dxup.dev](https://docs.dxup.dev)

## License

GPL-3.0 License - see [LICENSE](LICENSE) for details.

Free for self-hosting and commercial use with attribution.

## Credits & Donations

This is a **ONE-MAN** project that I've been dedicating my time to. Although it's my hobby project, beers help keep the momentum going! 🍻

<a href="https://www.buymeacoffee.com/duynguyen" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-green.png" alt="Buy Me A Coffee" height=48 ></a>
<a href="https://paypal.me/mrgoonie/" target="_blank"><img src="https://github.com/andreostrovsky/donate-with-paypal/blob/master/PNG/blue.png" height=48></a>
<a href="https://opencollective.com/diginext/donate" target="_blank"><img src="https://opencollective.com/diginext/donate/button@2x.png?color=blue" height=48 /></a>
<a href="https://me.momo.vn/mrgoonie" target="_blank"><img src="https://github.com/digitopvn/diginext/blob/main/docs/momo-button.png?raw=true" height=48 /></a>

**Author:** Duy Nguyen - CTO at [TOP GROUP](https://wearetopgroup.com)

**Contact:** duynguyen@wearetopgroup.com

---

**Made with ❤️ by developers, for developers.**
