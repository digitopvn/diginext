# DIGINEXT CLI & BUILD SERVER

**A BUILD SERVER** that run on your infrastructure and its **Command Line Interface (CLI)** with developer-friendly commands - a **must-have tool** of DevOps engineers. 

***Developers should not be frustrated by deploying their apps to the infrastructure, or bothering the DevOps engineers to help deploying it, they should fully focus on developing apps, they don't need to understand the servers, the domains, or infrastructure related stuffs. That's when `dx` come, `dx` is your DevOps assistant.***

| *Build faster. Deploy easier. More flexible.*

<p align="center">
  <img src="di-banner.png?raw=true" alt="Diginext Build Server & CLI">
</p>

---

## Installation

### Prerequisites

#### Requires
-   Install `jq` on your computer: https://stedolan.github.io/jq/download/
-   Install `Docker` on your computer: https://docs.docker.com/engine/install/ 
-   Install `kubectl` on your computer: [https://docs.docker.com/engine/install/](https://kubernetes.io/docs/tasks/tools/)

#### Optional
-   Install `gcloud`: https://cloud.google.com/sdk/docs/install#installation_instructions
-   Install `doctl`: https://docs.digitalocean.com/reference/doctl/

### Getting Started

```bash
npm i diginext -g
```

After installing, you can use the CLI command `dx` and spin up a build server with:

```bash
export MONGODB_CONNECTION_STRING=<YOUR_MONGODB_CONNECTION_STRING>
dx server up
# the build server will be available at: http://localhost:6969
```

---

## Documentation

- Visit our docs [here](docs/docs.md)

## Changelog

- Visit our [changelog here](CHANGELOG.md)

## Contributing [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

Read our [contributing guide](CONTRIBUTING.md) and let's build a better build platform together.

We welcome all contributions. Please read our [CONTRIBUTING.md](CONTRIBUTING.md) first. You can submit any ideas as [pull requests](https://github.com/digitopvn/diginext/pulls) or as [GitHub issues](https://github.com/digitopvn/diginext/issues). If you'd like to improve code, check out the [Development Instructions](https://github.com/digitopvn/diginext/wiki/Development) and have a good time! :)

If you are a collaborator, please follow our [Pull Request principle](https://github.com/digitopvn/diginext/wiki/PR-principle) to create a Pull Request with [collaborator template](https://github.com/digitopvn/diginext/compare?expand=1&template=collaborator.md).

[![Let's fund issues in this repository](https://issuehunt.io/static/embed/issuehunt-button-v1.svg)](https://issuehunt.io/repos/34526884)

## Build server

-   **Diginext** requires a MongoDB database to run the build server.

## Community and Support:

Join our community on [Discord]()!

Suggest improvements and report problems.

---

## Credits

- Author: Duy Nguyen <duynguyen@wearetopgroup.com>
- CTO at [TOP GROUP](https://wearetopgroup.com)
