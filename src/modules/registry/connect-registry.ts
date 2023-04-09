import { logError, logSuccess } from "diginext-utils/dist/console/log";
import { existsSync, unlink } from "fs";

import type { ContainerRegistry } from "@/entities";
import { createTmpFile } from "@/plugins";

import digitalocean from "../providers/digitalocean";
import gcloud from "../providers/gcloud";
import DockerRegistry from "./docker-registry";

export const connectRegistry = async (registry: ContainerRegistry, options?: { userId?: any; workspaceId?: any }) => {
	const { slug, provider, host } = registry;

	let connectedRegistry: ContainerRegistry;
	switch (provider) {
		case "gcloud":
			const { serviceAccount } = registry;

			if (!serviceAccount) throw new Error(`This container registry doesn't have any service account data.`);

			const serviceAccountFile = createTmpFile("gsa.json", serviceAccount);

			const authResult = await gcloud.authenticate({ ...options, filePath: serviceAccountFile });
			if (!authResult) throw new Error(`Can't authenticate with Google Cloud using this service account.`);

			connectedRegistry = await gcloud.connectDockerRegistry({ ...options, registry: slug, host });

			if (connectedRegistry) {
				logSuccess(`[CONTAINER REGISTRY] ✓ Connected to Container Registry "${registry.name}" (${registry.host} / ${registry.provider}).`);
			} else {
				throw new Error(`[CONTAINER REGISTRY] ❌ Failed to connect to this container registry (${registry.name}).`);
			}

			// delete temporary service account
			if (existsSync(serviceAccountFile)) unlink(serviceAccountFile, (err) => err && logError(`[REGISTRY] Delete temporary file:`, err));

			return connectedRegistry;

		case "digitalocean":
			const { apiAccessToken } = registry;

			const doAuthResult = await digitalocean.authenticate({ ...options, key: apiAccessToken });
			if (!doAuthResult) throw new Error(`Can't authenticate with Digital Ocean using this API access token.`);

			connectedRegistry = await digitalocean.connectDockerRegistry({ ...options, key: apiAccessToken });

			if (connectedRegistry) {
				logSuccess(`[CONTAINER REGISTRY] ✓ Connected to Container Registry "${registry.name}" (${registry.host} / ${registry.provider}).`);
			} else {
				throw new Error(`[CONTAINER REGISTRY] ❌ Failed to connect to this container registry (${registry.name}).`);
			}

			return connectedRegistry;

		case "dockerhub":
			const { dockerUsername, dockerPassword } = registry;

			connectedRegistry = await DockerRegistry.connectDockerToRegistry(
				{ username: dockerUsername, password: dockerPassword },
				{ workspaceId: options.workspaceId }
			);

			if (connectedRegistry) {
				logSuccess(`[CONTAINER REGISTRY] ✓ Connected to Container Registry "${registry.name}" (${registry.host} / ${registry.provider}).`);
			} else {
				throw new Error(`[CONTAINER REGISTRY] ❌ Failed to connect to this container registry (${registry.name}).`);
			}

			return connectedRegistry;

		default:
			throw new Error(
				`[CONTAINER REGISTRY] This container registry is not supported (${provider}), only "gcloud" and "digitalocean" are supported.`
			);
	}
};
