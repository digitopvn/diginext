# DXUP

### **A developer-focused platform for app deployment & centralized cloud resource management.**

https://dxup.dev

***Developers should not be frustrated by deploying apps to the infrastructure, or bothering the DevOps engineers to help deploying it, they should fully focus on developing apps, they don't need to understand the servers, the domains, or infrastructure related stuffs.***

> *Focus on building your apps, shipping fast, and shinning, and leave your cloud infrastructure to DXUP.*

> `dx` also means **Developer Experience**, and this is my number one goal - create the best experience for developers - let's make coding great again.

<p align="center">
  <img src="dx-banner.png?raw=true" alt="DXUP Build Server & CLI">
</p>

## Features

- **Overcoming Kubernetes complexity by stripping Kubernetes away**
- One-click deploy to any Kubernetes clusters of any cloud providers
    - ✅ GCP
    - ✅ DigitalOcean
    - ✅ Bare Metal K8S cluster
    - 🔜 AWS
    - 🔜 Azure
- Simple deploy of any public or private Docker image
- Application rollback to previously deployed versions
- Start developing new applications with frameworks or boilerplates
- Manage, auto-backup & restore databases:
    - ✅ Postgres
    - ✅ MySQL
    - ✅ MongoDB
- Manage & upload files to:
    - ✅ Google Storage
    - ✅ AWS S3 Block Storage
    - ✅ Digital Ocean Space
- Zero-downtime deploy and health checks
- Cronjobs for automation tasks
- Monitor CPU, RAM, and Network usage per deployment, per node & per cluster
- Marketplace for one click add-ons (e.g. MongoDB, Redis, PostgreSQL)

## Demo Video

[![Watch the video](https://raw.githubusercontent.com/digitopvn/diginext/main/demo.png)](https://www.youtube.com/watch?v=Q2jJ555Mc2k)

## Benefits

### For Developers

- Fully focus on development
- Deploy apps to any Kubernetes cluster (without understanding Kubernetes 🤯 ).
- Enhance your daily basis workflows with additional helpful commands for `k8s`, `git` and `database`
- Start new project quickly with a set of useful Frameworks.

### For DevOps

- If you’re managing multiple cluster, `dx` is definitely for you.
- Enhance your daily basis tasks with helpful commands to manage clusters, namespaces, secrets, deployments, workloads, etc…
- Monitoring your infrastructure with ease!
    - Manage Kubernetes clusters
    - Manage, backup & restore databases: MongoDB, MariaDB, PostgreSQL,…
- Automations, CI/CD, cronjobs, notifications, alerts,…

### Tech Leads, Managers, Company & Startups

- Manage & monitoring your projects easily.
- Overview of your teams & cloud resources.
- Faster diagnose, better logs, fewer stresses.
- Overview of your organization, your teams, your members, your projects, your apps and your investment in cloud resources.
- Better understanding about what your team is doing.
- Especially if you are poor, like us, but still want to adopt the mighty Kubernetes, `dx` is for you.

**Still not convinced?**

- [I turn my company’s PC into my own “Vercel-like” platform](https://dev.to/mrgoonie/i-turn-my-companys-pc-into-my-own-vercel-like-platform-351o)
- [Kubernetes for the poor](https://dev.to/mrgoonie/kubernetes-for-the-poor-2ne)
- [Speed test building Next.js T3 App with Github Actions, Circle CI, Vercel & DXUP](https://dev.to/mrgoonie/speed-test-building-nextjs-t3-app-with-github-actions-circle-ci-vercel-diginext-473i)
- [Developer-First Platforms - Overcoming K8S Complexity](https://dev.to/mrgoonie/developer-first-platforms-overcoming-k8s-complexity-1lf9)
- [“GitDevSecOps”](https://dev.to/mrgoonie/gitdevsecops-49gp)

## Roadmap

- Check out [this link](https://topgroup.notion.site/Roadmap-6a8266c2929c48ad8d4c11c954e9d852?pvs=4).

---

## Getting Started

- [DXUP website](https://dxup.dev/?ref=github)
- [Official Workspace](https://app.dxup.dev/?ref=github)
- [Documentation](https://docs.dxup.dev/?ref=github)

#### CLI Installation

Install the package globally:

```bash
npm i @topgroup/diginext --location=global
```

#### CLI Update

- To update your CLI to the latest version: `dx update` or `npm update @topgroup/diginext --location=global`.

---

Login to your DXUP workspace:

```bash
dx login 
# is similar with:
# $ dx login https://app.dxup.dev
# in case you hosted DXUP server yourself:
# $ dx login https://<your-diginext-workspace-domain>
cd /path/to/your/app
dx init
dx up

# custom deploy
dx up --prod
dx up --prod --rollout
dx up --prod --rollout --replicas=5
dx up --prod --rollout --replicas=5 --port=3000
dx up --prod --rollout --replicas=5 --port=3000 --select-cluster
# deploy to custom environment
dx up --staging
# deploy to other cluster
dx up --cluster=[cluster-name]
# deploy without SSL
dx up --no-ssl
# deploy with custom domain
dx up --domain=[your-domain]
# deploy with custom container size
dx up --size=2x
# deploy with DX API key
dx up --api-key=[your-dx-api-key]
# redirect all other domains to the first domain (for example: no-www -> www)
dx up --redirect
# upload local .env to dxup deployment
dx up --upload-env
# delete old deployments and deploy new
dx up --fresh
```

That's it!

---

Start developing a new app from boilerplate frameworks:

```bash
dx new
```

Available frameworks:
✓ Next.js (Page Router)
✓ Next.js (App Router)
✓ Nest.js
✓ Bun.js Starter
✓ Express.js Starter
✓ Static website with NGINX
✓ More to come!

## Running DXUP platform on your own infrastructure

**Requirements:**
- A server: any computers with Ubuntu, Debian or CentOS

### 1. With installation script

Access into your server (directly or via SSH), then run this script:

```bash
curl -sfL https://dxup.dev/install/microk8s | sh -
```

👉 [Detailed instruction](https://dev.to/mrgoonie/i-turn-my-companys-pc-into-my-own-vercel-like-platform-351o)

### 2. With Docker Engine

-   **DXUP** requires a MongoDB database to run the build server.

For fastest installation, I recommend to use our `docker-compose.yaml`, you will need to fill in some environment variables:

```yaml
...
  # Add your credentials so you can use Google Sign-in to authenticate with your workspace later on:
  - GOOGLE_CLIENT_ID=
  - GOOGLE_CLIENT_SECRET=
```

Then spin up the build server with: `docker compose up`, it will be available at: `http://localhost:6969`

Access the admin (`http://localhost:6969`) to configure your new workspace.

On the client side, use the CLI command `dx login http://your-workspace-domain.com` to login to your workspace and start new app with `dx new` or start deploying with `dx up` (or `dx deploy`).

👉 Read the [docs here](https://docs.dxup.dev/?ref=github).

### Other installation guides

- [Installation guide](https://topgroup.notion.site/Installation-6de7bda045224ed4b4ee5f4cc5681814?pvs=4)

---

## Changelog

- Visit our [changelog here](CHANGELOG.md)

## Admin UI

- Official workspace: https://app.dxup.dev
- Visit our [source code here](https://github.com/digitopvn/diginext-admin)

## Contributing [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

Read our [contributing guide](CONTRIBUTING.md) and let's build a better build platform together.

We welcome all contributions. Please read our [CONTRIBUTING.md](CONTRIBUTING.md) first. You can submit any ideas as [pull requests](https://github.com/digitopvn/diginext/pulls) or as [GitHub issues](https://github.com/digitopvn/diginext/issues). If you'd like to improve code, check out the [Development Instructions](https://github.com/digitopvn/diginext/wiki/Development) and have a good time! :)

If you are a collaborator, please follow our [Pull Request principle](https://github.com/digitopvn/diginext/wiki/PR-principle) to create a Pull Request with [collaborator template](https://github.com/digitopvn/diginext/compare?expand=1&template=collaborator.md).


## Community and Support:

Join our community on [Discord](https://discord.gg/xMuW5pN2Kn)!

Suggest improvements and report problems.

---

## Credits / Donations

This is a **ONE-MAN** project & I've been spending a lot of time for it, although it's my hobby project, I still need beers to keep the momentum.
If you enjoyed this project — or just feeling generous, consider buying me some beers. Cheers! 🍻

<a href="https://www.buymeacoffee.com/duynguyen" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-green.png" alt="Buy Me A Coffee" height=48 ></a>

<a href="https://paypal.me/mrgoonie/" target="_blank"><img src="https://github.com/andreostrovsky/donate-with-paypal/blob/master/PNG/blue.png" height=48></a>

<a href="https://opencollective.com/diginext/donate" target="_blank">
  <img src="https://opencollective.com/diginext/donate/button@2x.png?color=blue" height=48 />
</a>

<a href="https://me.momo.vn/mrgoonie" target="_blank">
  <img src="https://github.com/digitopvn/diginext/blob/main/docs/momo-button.png?raw=true" height=48 />
</a>

- Author: Duy Nguyen <duynguyen@wearetopgroup.com>
- CTO at [TOP GROUP](https://wearetopgroup.com)

Thank you!

## My other products

- [DigiCord AI](https://digicord.site) - The Most Useful AI Chatbot on Discord
- [IndieBacklink.com](https://indiebacklink.com) - Indie Makers Unite: Feature, Support, Succeed
- [TopRanking.ai](https://topranking.ai) - AI Directory, listing AI products
- [ZII.ONE](https://zii.one) - Personalized Link Shortener
- [VidCap.xyz](https://vidcap.xyz) - Extract Youtube caption, download videos, capture screenshot, summarize,…
- [ReadTube.me](https://readtube.me) - Write blog articles based on Youtube videos
- [BoostTogether.com](https://boosttogether.com) - The Power of WE in Advertising
- [AIVN.Site](https://aivn.site) - Face Swap, Remove BG, Photo Editor,…
- [DxUp.dev](https://dxup.dev) - Developer-focused platform for app deployment & centralized cloud resource management.
