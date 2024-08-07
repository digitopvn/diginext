import { logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import { existsSync, unlink } from "fs";

import { Config } from "@/app.config";
import type { IContainerRegistry } from "@/entities";
import { createTmpFile } from "@/plugins";
import { isMasked } from "@/plugins/mask-sensitive-info";

import digitalocean from "../providers/digitalocean";
import gcloud from "../providers/gcloud";
import DockerRegistry from "./docker-registry";

export type ConnectRegistryOptions = {
	userId?: any;
	workspaceId?: any;
	insertDatabase?: boolean;
	builder?: "docker" | "podman";
	filePath?: string;
	token?: string;
};

export const connectRegistry = async (registry: IContainerRegistry, options?: ConnectRegistryOptions) => {
	const { slug, provider, host } = registry;
	const { filePath, token } = options || {};

	let connectedRegistry: IContainerRegistry;
	const builderName = options?.builder?.toUpperCase() || Config.BUILDER.toUpperCase();

	switch (provider) {
		case "gcloud":
			const { serviceAccount } = registry;

			const serviceAccountFile = serviceAccount && !isMasked(serviceAccount) ? createTmpFile("gsa.json", serviceAccount) : filePath;
			if (!serviceAccountFile) throw new Error(`Service account file is required.`);

			connectedRegistry = await gcloud.connectDockerRegistry({ ...options, filePath: serviceAccountFile, registry: slug, host });

			if (connectedRegistry) {
				logSuccess(`[CONTAINER REGISTRY] ✓ ${builderName}: Connected to Container Registry "${registry.name}".`);
			} else {
				throw new Error(`[CONTAINER REGISTRY] ❌ ${builderName}: Failed to connect to this container registry (${registry.name}).`);
			}

			// delete temporary service account
			if (existsSync(serviceAccountFile)) unlink(serviceAccountFile, (err) => err && logError(`[REGISTRY] Delete temporary file:`, err));

			return connectedRegistry;

		case "digitalocean":
			const { apiAccessToken } = registry;

			const key = apiAccessToken && !isMasked(apiAccessToken) ? apiAccessToken : token;
			if (!key) throw new Error(`API Access Token is required.`);

			// const doAuthResult = await digitalocean.authenticate({ ...options, key });
			// if (!doAuthResult) throw new Error(`Can't authenticate with Digital Ocean using this API access token.`);

			connectedRegistry = await digitalocean.connectDockerRegistry({ ...options, key, registry: slug });

			if (connectedRegistry) {
				logSuccess(`[CONTAINER REGISTRY] ✓ ${builderName}: Connected to Container Registry "${registry.name}".`);
			} else {
				throw new Error(`[CONTAINER REGISTRY] ❌ ${builderName}: Failed to connect to this container registry (${registry.name}).`);
			}

			return connectedRegistry;

		case "dockerhub":
			const { dockerUsername, dockerPassword } = registry;

			const password = dockerPassword && !isMasked(dockerPassword) ? dockerPassword : token;
			if (!password)
				throw new Error(
					`Docker access token is required. Try again with:\n  $ PASSWORD=<your_docker_password>\n  $ dx registry connect --token=$PASSWORD`
				);

			connectedRegistry = await DockerRegistry.connectDockerToRegistry(
				{ username: dockerUsername, password: dockerPassword },
				{ workspaceId: options?.workspaceId, registry: slug }
			);

			if (connectedRegistry) {
				logSuccess(`[CONTAINER REGISTRY] ✓ ${builderName}: Connected to Container Registry "${registry.name}".`);
			} else {
				throw new Error(`[CONTAINER REGISTRY] ❌ ${builderName}: Failed to connect to this container registry (${registry.name}).`);
			}

			return connectedRegistry;

		default:
			throw new Error(
				`[CONTAINER REGISTRY] This container registry is not supported (${provider}), only "dockerhub", "gcloud" and "digitalocean" are supported.`
			);
	}
};
