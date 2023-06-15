# DIGINEXT CLI & BUILD SERVER

**A BUILD SERVER** that run on your infrastructure and its **Command Line Interface (CLI)** with developer-friendly commands - a **must-have tool** of DevOps engineers. 

***Developers should not be frustrated by deploying their apps to the infrastructure, or bothering the DevOps engineers to help deploying it, they should fully focus on developing apps, they don't need to understand the servers, the domains, or infrastructure related stuffs. That's when `dx` come, `dx` is your DevOps assistant.***

| *Build faster. Deploy easier. More flexible.*

| `dx` also means **Developer Experience**, and this is our number one goal - create the best experience for developers.

<p align="center">
  <img src="di-banner.png?raw=true" alt="Diginext Build Server & CLI">
</p>

---

## Getting Started

- [Getting started (Latest updates)](https://topgroup.notion.site/Getting-Started-8d4155a1797641e6aa4ead9446868533?pvs=4)

### If you are a developer and you just want to deploy your app immediately)

#### Required

-   Install [Docker](https://docs.docker.com/engine/install/) or [Podman](https://podman.io/getting-started/installation#podman-installation-instructions) on your computer.
-   __**NOTES:**__: By default the build server will use Podman as container image builder ([WHY?](readme.md#why-podman-over-docker)), if you want to use Docker as your builder, remember to specify the environment variable `BUILDER=docker`.

#### Installation

Install the package globally:

```bash
npm i @topgroup/diginext --location=global
```

Login to our build server:

```bash
dx login https://app.diginext.site
cd /path/to/your/app
dx init
dx deploy
```

That's it!

---

Or login to your team's build server:

```bash
dx login https://buildserverdomain.example
cd /path/to/your/app
dx init
dx deploy
```

---

Start a new app from scratch:

```bash
dx new
```

## Build server

-   **Diginext** requires a MongoDB database to run the build server.

### If you want to run a build server for your own / team / organization

#### Run your server with Docker Compose (Recommended)

For fastest installation, we recommend to use our `docker-compose.yaml`, you will need to fill in some environment variables:

```bash
...
  # Add your credentials so you can use Google Sign-in to authenticate with your workspace later on:
  - GOOGLE_CLIENT_ID=
  - GOOGLE_CLIENT_SECRET=
```

Then spin up the build server with: `docker compose up`, it will be available at: `http://localhost:6969`

Access the admin (`http://localhost:6969`) to configure your new workspace, add some cluster access information.

On the client side, use the CLI command `dx login http://your-workspace-domain.com` to login to your workspace and start new app with `dx new` or start deploying with `dx deploy`.

Read the [docs here](docs/docs.md).

#### Manual installation

-   Install `kubectl`: [https://kubernetes.io/docs/tasks/tools/](https://kubernetes.io/docs/tasks/tools/)
-   Install `MongoDB`: https://www.mongodb.com/docs/manual/installation/
-   Install `gcloud`: https://cloud.google.com/sdk/docs/install#installation_instructions
-   Install `doctl`: https://docs.digitalocean.com/reference/doctl/

Install the package globally:

```bash
npm i @topgroup/diginext --location=global
```

After installing, you can use the CLI command `dx` and spin up a build server with:

```bash
export DB_URI=<YOUR_DB_URI>
dx server up
```

The build server will be available at: http://localhost:6969

Access the admin to configure your new workspace, add some cluster access information.

On the client side, use the CLI command `dx login http://your-workspace-domain.com` to login to your workspace and start new app with `dx new` or start deploying with `dx deploy`.

For example, to deploy your project:

```bash
cd /path/to/your/project
# initialize your application (register it with the build server)
dx init
# complete the form, then use the command below to deploy:
dx deploy
```

Read the [docs here](docs/docs.md).

### Why PODMAN over DOCKER?

For simple installation, we usually like to spin up the Diginext build server with Docker / Docker Compose or Kubernetes, this is the concept of [Docker-in-Docker](https://www.docker.com/blog/docker-can-now-run-within-docker/), Docker Engine requires deamonset to build your image, therefor you need to run the container as `root` user with `privileged` mode & also mount `docker.sock` volume. Running a container in `privileged` mode is a bad practice since it would lead to security issue (if you don't know this, [read here](https://www.trendmicro.com/en_us/research/19/l/why-running-a-privileged-container-in-docker-is-a-bad-idea.html)).

On the other hand, [Podman](https://podman.io/) is a daemonless container engine for developing, managing, and running OCI Containers. Containers can either be run as `root` or in `rootless` mode. Podman also has similar commands with Docker, so it would be simpler to implement into **Diginext**.

**__Notes:__** there is a bit of tradeoff when using Podman instead of Docker as a builder - build speed. You will notice a slightly increase build time when using Podman, however, I would make it as an acceptance rather facing any potential risks in the future.

---

## Update

- To update your CLI to the latest version: `dx update` or `npm update @topgroup/diginext --location=global`.

## Documentation

- Visit our [docs here](docs/docs.md)

## Changelog

- Visit our [changelog here](CHANGELOG.md)

## Admin UI

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
