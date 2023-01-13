# Documentation

## Project & App Helper

-   Create new project:

    ```bash
    dx new
    ```

-   **[!!! DANGER !!!]** Forcefully create new project **(overwriting current directory & git repo if any)**:

    ```bash
    dx new --overwrite

    # short term:
    dx new -o
    ```

-   Initialize a framework in the current app directory:

    ```bash
    cd /path/to/current/app
    dx init
    ```

-   Update **Diginext** to new version:

    ```bash
    npm i diginext@latest -g
    ```

## Deployment

-   Authenticate Google Cloud with Service Account:

    ```bash
    dx gcloud auth -f /path/to/service-account.json
    ```

-   Authenticate Digital Ocean with API access token:

    ```bash
    dx do auth --key=<DO_API_ACCESS_TOKEN>
    ```

-   Connect Docker with Google Container Registry:

    ```bash
    # [Authentication required] `dx gcloud auth -f /path/to/service-account.json`
    dx gcloud registry connect --host=<GOOGLE_CONTAINER_REGISTRY_URL>
    ```

-   Connect Docker with Digital Ocean Container Registry:

    ```bash
    # [Authentication required] `dx do auth --key=<DO_API_ACCESS_TOKEN>`
    dx do registry connect
    ```

-   Build the application on your computer & push that Docker image to the Container Registry:

    ```bash
    # cần authenticate provider & connect to registry trước (xem ở trên)
    # build & push to DEV environment
    dx build
    # build & push to PROD environment
    dx build --prod
    ```

-   Deploy your web app to **DEV environment**:

    ```bash
    dx deploy
    # is equalivent with
    dx deploy --dev
    ```

-   Deploy to **DEV environment** at any K8S clusters:

    ```bash
    dx deploy --dev --select-cluster
    ```

-   Deploy to **PRODUCTION environment**:

    ```bash
    dx deploy --prod

    # to any other clusters
    dx deploy --prod --select-cluster
    ```

    **New deployment of PROD environment will not be rolled out immediately like other environments.**

    After the build process finished, access [Diginext Admin](https://app.diginext.site) to preview the deployment, if everything is okay, you can process ROLLING OUT within the Admin UI.

-   Deploy to **any enviroments**:

    ```bash
    dx deploy --env=canary
    ```

### App Deployment Configuration File Explain - `dx.json` 

-   Add new domain to **DEVELOPMENT environment**:
    - Open `dx.json` & add your domain to "environment > dev > domains"
    - (eg: `{ dev: { domains: ["example.com"] } }`)

-   Add new domain to **PRODUCTION environment**:
    - Open `dx.json` &  add your domain to "environment > dev > domains"
    - (eg: `{ prod: { domains: ["example.com"] } }`)

-   Do the same for other environments.

## Build

(TBU)

## Framework

(TBU)

## Cluster

(TBU)

## Workspace

(TBU)

## Storage

(TBU)

## Database

(TBU)

## Tracking (GA4/GTAG)

(TBU)

## Git Provider

(TBU)
