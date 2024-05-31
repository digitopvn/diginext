# CLI Documentation

## General

- Authenticate your CLI with your workspace:

    ```bash
    dx login
    # is similar with
    dx login https://app.dxup.dev
    ```

- Authenticate your CLI with your **self-hosted** workspace:

    ```bash
    dx login https://your-self-hosted.workspace
    ```

- Sign out from your workspace:

    ```bash
    dx logout
    ```

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

## Build & Deployment

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

-   Request Diginext Server to build the application & push that image to the Container Registry (**It won't deploy the app**):

    ```bash
    dx build

    # options
    dx build --registry=<registry-slug>
    dx build --image=<image_url>:<image_tag>
    ```

-   Deploy your web app to **DEV environment**:

    ```bash
    dx up
    # is similar with
    dx up --dev
    # is similar with
    dx deploy
    # is similar with
    dx deploy --dev
    ```

-   Deploy to **DEV environment** at any K8S clusters:

    ```bash
    dx up --dev --select-cluster
    ```

-   Deploy to **PRODUCTION environment**:

    ```bash
    dx up --prod

    # to any other clusters
    dx up --prod --select-cluster
    ```

    **New deployment of PROD environment will not be rolled out immediately like other environments.**

    After the build process finished, access [Diginext Workspace](https://app.dxup.dev) to preview the deployment, if everything is okay, you can process ROLLING OUT within the Admin UI.

-   Deploy to **custom enviroments**:

    ```bash
    dx up --env=canary
    ```

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
