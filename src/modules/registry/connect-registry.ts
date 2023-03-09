import { logError, logSuccess } from "diginext-utils/dist/console/log";

import type { ContainerRegistry } from "@/entities";
import { createTmpFile } from "@/plugins";

import digitalocean from "../providers/digitalocean";
import gcloud from "../providers/gcloud";

export const connectRegistry = async (registry: ContainerRegistry, options?: { userId?: any; workspaceId?: any }) => {
	const { slug, provider, host } = registry;

	let connectedRegistry: ContainerRegistry;
	switch (provider) {
		case "gcloud":
			const { serviceAccount } = registry;

			if (!serviceAccount) {
				logError(`This container registry doesn't have any service account data.`);
				return false;
			}

			const serviceAccountFile = createTmpFile("gsa.json", serviceAccount);

			const authResult = await gcloud.authenticate({ ...options, filePath: serviceAccountFile });
			if (!authResult) return;

			connectedRegistry = await gcloud.connectDockerRegistry({ ...options, registry: slug, host });

			if (connectedRegistry) {
				logSuccess(`[CONTAINER REGISTRY] ✓ Connected to Container Registry "${registry.name}" (${registry.host} / ${registry.provider}).`);
			} else {
				logError(`[CONTAINER REGISTRY] ❌ Failed to connect to this container registry (${registry.name}).`);
			}

			return connectedRegistry;

		case "digitalocean":
			const { apiAccessToken } = registry;

			const doAuthResult = await digitalocean.authenticate({ ...options, key: apiAccessToken });
			if (!doAuthResult) return;

			connectedRegistry = await digitalocean.connectDockerRegistry({ ...options, key: apiAccessToken });

			if (connectedRegistry) {
				logSuccess(`[CONTAINER REGISTRY] ✓ Connected to Container Registry "${registry.name}" (${registry.host} / ${registry.provider}).`);
			} else {
				logError(`[CONTAINER REGISTRY] ❌ Failed to connect to this container registry (${registry.name}).`);
			}

			return connectedRegistry;

		default:
			logError(`[CONTAINER REGISTRY] This container registry is not supported (${provider}), only "gcloud" and "digitalocean" are supported.`);
			return false;
	}
};
