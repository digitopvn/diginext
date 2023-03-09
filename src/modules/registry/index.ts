import { logError, logWarn } from "diginext-utils/dist/console/log";

import type { Cluster } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";

import { DB } from "../api/DB";
import { askForCluster } from "../cluster/ask-for-cluster";
import { askForNamespace } from "../k8s/ask-for-namespace";
import digitalocean from "../providers/digitalocean";
import gcloud from "../providers/gcloud";
import { askToConnectRegistry } from "./ask-connect-registry";
import { askForRegistry } from "./ask-for-registry";

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
				if (!cluster) {
					logError(`No cluster named "${options.cluster}" found.`);
					return;
				}
			} else {
				cluster = await askForCluster();
			}
			const { providerShortName } = cluster;

			let registrySlug: string;
			if (registry) {
				registrySlug = registry;
			} else {
				const selectedRegistry = await askForRegistry();
				registrySlug = selectedRegistry.slug;
			}

			const targetNamespace = namespace || (await askForNamespace(cluster));

			if (providerShortName == "gcloud")
				return gcloud.createImagePullingSecret({
					clusterShortName: cluster.shortName,
					registrySlug,
					namespace: targetNamespace,
					shouldCreateSecretInNamespace,
				});

			if (providerShortName == "digitalocean")
				return digitalocean.createImagePullingSecret({
					clusterShortName: cluster.shortName,
					registrySlug,
					namespace: targetNamespace,
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
