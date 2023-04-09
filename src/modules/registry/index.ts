import { isJSON } from "class-validator";
import { logError } from "diginext-utils/dist/console/log";
import { existsSync, readFileSync } from "fs";

import type { Cluster, ContainerRegistry, ContainerRegistryDto } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";

import { DB } from "../api/DB";
import { askForCluster } from "../cluster/ask-for-cluster";
import { askForNamespace } from "../k8s/ask-for-namespace";
import digitalocean from "../providers/digitalocean";
import gcloud from "../providers/gcloud";
import { addContainerRegistry } from "./add-container-registry";
import { askToConnectRegistry } from "./ask-connect-registry";
import { askForRegistry } from "./ask-for-registry";
import DockerRegistry from "./docker-registry";

export const execRegistry = async (options: InputOptions) => {
	let { secondAction, registry: registrySlug, namespace, shouldCreate: shouldCreateSecretInNamespace } = options;

	switch (secondAction) {
		case "add":
			// parse from CLI arguments
			const registryData: ContainerRegistryDto = {};
			registryData.name = options.name;
			if (options.filePath) {
				if (existsSync(options.filePath)) return logError(`File "${options.filePath}" not found.`);
				const serviceAccount = readFileSync(options.filePath, "utf8");
				registryData.serviceAccount = serviceAccount;
			}
			registryData.apiAccessToken = options.token || options.key;
			registryData.dockerUsername = options.user;
			registryData.dockerPassword = options.pass;
			registryData.dockerEmail = options.email;
			registryData.dockerServer = options.server;

			const sa = isJSON(registryData.serviceAccount) ? JSON.parse(registryData.serviceAccount) : {};
			registryData.organization = options.org || options.providerProject || registryData.dockerUsername || sa.project_id;

			return addContainerRegistry(registryData, { ownerId: options.userId, workspaceId: options.workspaceId });

		case "connect":
			return askToConnectRegistry(options);

		case "allow":
		case "create-secret":
			let registry: ContainerRegistry;
			if (registrySlug) {
				registry = await DB.findOne<ContainerRegistry>("registry", { slug: registrySlug });
			} else {
				registry = await askForRegistry();
				registrySlug = registry.slug;
			}
			const { provider } = registry;

			let cluster: Cluster;
			if (options.cluster) {
				cluster = await DB.findOne<Cluster>("cluster", { shortName: options.cluster });
				if (!cluster) return logError(`Cluster named "${options.cluster}" not found.`);
			} else {
				cluster = await askForCluster();
			}
			const { shortName: clusterShortName } = cluster;

			if (!namespace) namespace = await askForNamespace(cluster);

			switch (provider) {
				case "digitalocean":
					return digitalocean.createImagePullingSecret({
						clusterShortName,
						registrySlug,
						namespace,
					});

				case "gcloud":
					return gcloud.createImagePullingSecret({
						clusterShortName,
						registrySlug,
						namespace,
					});

				case "dockerhub":
					return DockerRegistry.createImagePullSecret({
						clusterShortName,
						registrySlug,
						namespace,
					});

				default:
					logError(`Container registry provider "${provider}" is not valid.`);
					break;
			}

		case "secret":
			// TODO: get "imagePullSecrets" value as JSON or YAML (from database)
			break;

		default:
			break;
	}
};
