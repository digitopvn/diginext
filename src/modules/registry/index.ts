import { logError, logWarn } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { Cluster, ContainerRegistry } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";

import { DB } from "../api/DB";
import digitalocean from "../providers/digitalocean";
import gcloud from "../providers/gcloud";
import { askToConnectRegistry } from "./ask-connect-registry";

export const execRegistry = async (options: InputOptions) => {
	const { secondAction, provider, registry, namespace, shouldCreate: shouldCreateSecretInNamespace } = options;

	switch (secondAction) {
		case "connect":
			if (typeof provider === "undefined") {
				// logWarn(`Cloud Provider's short name is required.`);
				return askToConnectRegistry(options);
			}

			if (provider == "gcloud") {
				return gcloud.connectDockerRegistry(options);
			}

			if (provider == "digitalocean") {
				return digitalocean.connectDockerRegistry(options);
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
