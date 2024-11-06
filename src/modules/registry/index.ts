import { isJSON } from "class-validator";
import { logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import { existsSync, readFileSync } from "fs";

import type { ContainerRegistryDto, ICluster, IContainerRegistry } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";

import { askForCluster } from "../cluster/ask-for-cluster";
import { askForNamespace } from "../k8s/ask-for-namespace";
import { addContainerRegistry } from "./add-container-registry";
import { askToConnectRegistry } from "./ask-connect-registry";
import { askForRegistry } from "./ask-for-registry";

export const execRegistry = async (options: InputOptions) => {
	let { secondAction, registry: registrySlug, namespace } = options;
	const { DB } = await import("@/modules/api/DB");

	switch (secondAction) {
		case "add":
			// parse from CLI arguments
			const registryData = {} as ContainerRegistryDto;
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
			let registry: IContainerRegistry;
			if (registrySlug && typeof registrySlug !== "boolean") {
				registry = await DB.findOne("registry", { slug: registrySlug }, { subpath: "/all" });
			} else {
				registry = await askForRegistry();
				registrySlug = registry.slug;
			}

			let cluster: ICluster;
			if (options.cluster) {
				cluster = await DB.findOne("cluster", { slug: options.cluster }, { subpath: "/all" });
				if (!cluster) return logError(`Cluster "${options.cluster}" not found.`);
			} else {
				cluster = await askForCluster();
			}
			const { slug: clusterSlug } = cluster;

			if (!namespace) namespace = await askForNamespace(cluster);

			const res = await DB.create("cluster", { registrySlug, clusterSlug, namespace }, { subpath: "/image-pull-secret" });
			if (!res) return logError(`Failed to create "imagePullSecret".`);
			logSuccess(`ImagePullSecret "${res.name}" created.`);

		// switch (provider) {
		// 	case "digitalocean":
		// 		return digitalocean.createImagePullingSecret({
		// 			clusterSlug,
		// 			registrySlug,
		// 			namespace,
		// 		});

		// 	case "gcloud":
		// 		return gcloud.createImagePullingSecret({
		// 			clusterSlug,
		// 			registrySlug,
		// 			namespace,
		// 		});

		// 	case "dockerhub":
		// 		return DockerRegistry.createImagePullSecret({
		// 			clusterSlug,
		// 			registrySlug,
		// 			namespace,
		// 		});

		// 	default:
		// 		logError(`Container registry provider "${provider}" is not valid.`);
		// 		break;
		// }

		case "secret":
			// TODO: get "imagePullSecrets" value as JSON or YAML (from database)
			break;

		default:
			break;
	}
};
