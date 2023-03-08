import { logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import * as fs from "fs";
import inquirer from "inquirer";
import { isEmpty } from "lodash";
import path from "path";

import { CLI_CONFIG_DIR } from "@/config/const";
import type { Cluster, ContainerRegistry } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";

import { DB } from "../api/DB";
import digitalocean from "../providers/digitalocean";
import gcloud from "../providers/gcloud";

export const connect = async (registry: ContainerRegistry, options?: { userId?: any; workspaceId?: any }) => {
	const { provider, host } = registry;

	switch (provider) {
		case "gcloud":
			const { serviceAccount } = registry;

			const tmpDir = path.resolve(CLI_CONFIG_DIR, `registry`);
			if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
			const tmpFilePath = path.resolve(tmpDir, `gcloud-service-account.json`);
			fs.writeFileSync(tmpFilePath, serviceAccount, "utf8");

			const authResult = await gcloud.authenticate({ filePath: tmpFilePath, ...options });
			const connectResult = await gcloud.connectDockerRegistry({ filePath: tmpFilePath, host, ...options });
			if (connectResult) logSuccess(`[CONTAINER REGISTRY] ✓ Connected to Container Registry: "gcloud"`);
			// console.log("authResult :>> ", authResult);
			return authResult;

		case "digitalocean":
			const { apiAccessToken } = registry;
			const doResult = await digitalocean.authenticate({ key: apiAccessToken, ...options });
			if (doResult) logSuccess(`[CONTAINER REGISTRY] ✓ Connected to Container Registry: "digitalocean"`);
			return doResult;

		default:
			logError(`[CONTAINER REGISTRY] This container registry is not supported (${provider}), only "gcloud" and "digitalocean" are supported.`);
			return false;
	}
};

export const execRegistry = async (options: InputOptions) => {
	const { secondAction, provider, registry, namespace, shouldCreate: shouldCreateSecretInNamespace } = options;

	switch (secondAction) {
		case "connect":
			if (provider == "gcloud") return gcloud.connectDockerRegistry(options);
			if (provider == "digitalocean") return digitalocean.connectDockerRegistry(options);
			if (typeof provider === "undefined") {
				logWarn(`Cloud Provider's short name is required.`);
				return;
			}
			logWarn(`Provider "${provider}" is not valid.`);
			break;

		case "allow":
			let cluster: Cluster;
			if (options.cluster) {
				cluster = await DB.findOne<Cluster>("cluster", { shortName: options.cluster });
			} else {
				const clusters = await DB.find<Cluster>("cluster", {});
				if (isEmpty(clusters)) {
					logError(`There are no registered clusters in this workspace.`);
					return;
				}
				const { selectedCluster } = await inquirer.prompt<{ selectedCluster: Cluster }>({
					type: "list",
					default: clusters[0],
					choices: clusters.map((c, i) => {
						return { name: `[${i + 1}] ${c.name} (${c.providerShortName})`, value: c };
					}),
				});
				cluster = selectedCluster;
			}
			const { providerShortName } = cluster;

			let registrySlug: string;
			if (registry) {
				registrySlug = registry;
			} else {
				const registries = await DB.find<ContainerRegistry>("registry", {});
				if (isEmpty(registries)) {
					logError(`There are no registered container registries in this workspace.`);
					return;
				}
				const { selectedRegistry } = await inquirer.prompt<{ selectedRegistry: ContainerRegistry }>({
					type: "list",
					default: registries[0],
					choices: registries.map((c, i) => {
						return { name: `[${i + 1}] ${c.name} (${c.provider})`, value: c };
					}),
				});
				registrySlug = selectedRegistry.slug;
			}

			if (providerShortName == "gcloud")
				return gcloud.createImagePullingSecret({
					clusterShortName: cluster.shortName,
					registrySlug,
					namespace,
					shouldCreateSecretInNamespace,
				});

			if (providerShortName == "digitalocean")
				return digitalocean.createImagePullingSecret({
					clusterShortName: cluster.shortName,
					registrySlug,
					namespace,
					shouldCreateSecretInNamespace,
				});

			logWarn(`Provider "${providerShortName}" is not valid.`);
			break;

		case "secret":
			// TODO: get "imagePullSecrets" value as JSON or YAML (from database)
			break;

		default:
			break;
	}
};
