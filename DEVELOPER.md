# Development Workflow

This document describes how to set up your development environment.

## With Docker Compose

The fastest way to start developing Diginext is using Docker Compose, since mostly everything (like developer tools) is pre-installed and pre-configurated inside the container images.

You can use this example `docker-compose.dev.example.yaml`

```yaml
version: "3"
networks:
    bridge:
        driver: bridge
volumes:
		mongo:
    home:
    node:
services:
    mongo:
        ports:
            - '27017:27017'
        container_name: mongo
        restart: always
        logging:
            driver: none
        networks:
            - bridge
        environment:
            - MONGO_INITDB_ROOT_USERNAME=root
            - MONGO_INITDB_ROOT_PASSWORD=diginext
        image: mongo
        volumes:
            - mongo:/data/db
    diginext:
        container_name: diginext
        build:
            context: .
            dockerfile: Dockerfile.dev
        working_dir: /usr/app/
        ports:
            - "6969:6969"
        networks:
            - bridge
        entrypoint: /usr/app/scripts/startup-dev.sh
        volumes:
            # docker.sock -> comment this out if you're using PODMAN
            - "/var/run/docker.sock:/var/run/docker.sock"
            # Persist NODE_MODULES & HOME DIR with named Docker volume
            - node:/usr/app/node_modules/
            - home:/home/app/
            # Persist data with host path -> HOST:CONTAINER
            - ./src:/usr/app/src
            - ./public:/usr/app/public
            - ./storage:/var/app/storage
            - ./scripts:/usr/app/scripts
        environment:
            - NODE_ENV=development
            - PORT=6969
            - BASE_URL=http://localhost:6969
            - DB_URI=mongodb://root:diginext@mongo:27017/diginext?authSource=admin
            - CLI_MODE=server
            - JWT_SECRET=
            - JWT_EXPIRE_TIME=48h
            - GOOGLE_CLIENT_ID=
            - GOOGLE_CLIENT_SECRET=
```

Start your development environment with: `docker compose -f docker-compose.dev.yaml up --attach diginext`

Check out your server endpoint at: [http://localhost:6969](http://localhost:6969) 

## Manual

Developing inside a Docker Container environment sometime consumes a lot of your computer’s resources, or you just want to start from scratch. There you go:

> *I use `pnpm` instead of `npm` because I find it a bit faster. Therefore, I recommend that you also use `pnpm`, especially since I have set up some scripts in `package.json` that utilize `pnpm`.*
> 

### Diginext Server & CLI

After cloning `[digitopvn/diginext](https://github.com/digitopvn/diginext)`, run `npm install` to fetch its dependencies. Then, you can run several commands:

1. `npm run dev` runs Diginext Server locally, the Dashboard UI should be: [http://localhost:6969](http://localhost:6969) 
2. `npm run lint` checks the code style.
3. `npm run build` to build the TypeScript to JavaScript at `dist/` and link the current directory to global `node_modules`, so you can test your CLI commands locally.

#### Development Tools

- Git
- Node.js (16+)
- Docker
    - Docker BuildX
- Podman
- OpenSSH
- kubectl
    - google-cloud-sdk-gke-gcloud-auth-plugin
- helm
- gcloud
- doctl

### Workspace Dashboard

The repository of workspace dashboard is located at `[digitopvn/diginext-admin](https://github.com/digitopvn/diginext-admin)`, clone it to your computer and place at the same level of the Diginext Server source code. 

For example:

```bash
- **diginext/**
    - src/
    - dist/
    - …
- **diginext-admin/**
    - src/
    - pages/
    - …
```

Run `npm install` and `npm run dev` to start development, your dev link should be [http://localhost:3000](http://localhost:3000) 

1. `npm run dev` runs Workspace Dashboard website locally.
2. `npm run lint` checks the code style.
3. `npm run export-to-cli` to export Workspace Dashboard to static HTML files and copy to `../diginext/public` directory

## Initial Setup

When you spin up a new development environment, there will be a couple things you should be aware of:

### Authenticate with your Git Providers

Assuming you are familiar with Git workflow and understand SSH keys, if not, [read here](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/about-ssh). To pull and push to the Git repository, the keys on your machine have to match those in the Git provider's settings. The same applies to Diginext Server. In order to pull your git repositories for building container images, Diginext Server requires access to your repositories via SSH keys.

#### 1. Using Diginext Server generated key

(TBU)

#### 2. Using your machine’s key

(TBU)

#### 3. Using custom private key & public key

(TBU)

## Running Tests Locally

It would be greatly appreciated if PRs that change code come with appropriate tests.

To create a test for a specific issue opened on github, create a file: `test/github-issues/<num>/issue-<num>.ts` where
`<num>` is the corresponding github issue. For example, if you were creating a PR to fix github issue #363, you'd
create `test/github-issues/363/issue-363.ts`.

Most tests will benefit from using this template as a starting point:

```ts
import "reflect-metadata";
import { createTestingConnections, closeTestingConnections, reloadTestingDatabases } from "../../utils/test-utils";
import { DataSource } from "../../../src/data-source/DataSource"
import { expect } from "chai";

describe("github issues > #<issue number> <issue title>", () => {

    let dataSources: DataSource[];
    before(async () => dataSources = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        schemaCreate: true,
        dropSchema: true,
    }));
    beforeEach(() => reloadTestingDatabases(dataSources));
    after(() => closeTestingConnections(dataSources));

    it("should <put a detailed description of what it should do here>", () => Promise.all(dataSources.map(async dataSource => {

       // tests go here

    })));

    // you can add additional tests if needed

});
```

To run the tests:

```shell
npm test
```

You should execute test suites before submitting a PR to github.
All the tests are executed on our Continuous Integration infrastructure and a PR could only be merged once the tests pass.

**Executing only some tests**: When you are creating tests to some specific code, you may want only execute the tests that you're creating, so you waste less time to verify your code. To do this, you can temporarily modify your tests definitions adding `.only` *mocha* commands **(describe, it)**. Example:

```
describe.only('your describe test', ....)
```

>**Hint:** you can use the `--grep` flag to pass a Regex to `gulp-mocha`. Only the tests have have `describe`/`it`
>statements that match the Regex will be run. For example:
>
>```shell
>npm test -- --grep="github issues > #363"
>```
>
>This is useful when trying to get a specific test or subset of tests to pass.

### Faster developer cycle for editing code and running tests

The `npm test` script works by deleting built TypeScript code, rebuilding the codebase, and then running tests. This can take a long time.

Instead, for a quicker feedback cycle, you can run `npm run compile -- --watch` to make a fresh build and instruct TypeScript to watch for changes and only compile what code you've changed.

Once TypeScript finishes compiling your changes, you can run `npm run test-fast` (instead of `test`), to trigger a test without causing a full recompile, which allows you to edit and check your changes much faster.

