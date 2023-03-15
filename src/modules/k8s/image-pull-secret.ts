import { log, logError } from "diginext-utils/dist/console/log";
import { isEmpty } from "lodash";

import type { App, ContainerRegistry } from "@/entities";

import { DB } from "../api/DB";
import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import digitalocean from "../providers/digitalocean";
import gcloud from "../providers/gcloud";
import type { ContainerRegistrySecretOptions } from "../registry/ContainerRegistrySecretOptions";

/**
 * Create imagePullSecrets in a namespace
 * @param appSlug - App's slug
 * @param env @example "dev", "prod"
 * @param clusterShortName - Cluster's short name on Cloud Provider (this is **NOT** a cluster name in `KUBE_CONFIG`)
 * @param namespace @default "default"
 */
export async function createImagePullSecretsInNamespace(appSlug: string, env: string, clusterShortName: string, namespace: string = "default") {
	let message = "";

	let app = await DB.findOne<App>("app", { slug: appSlug });

	if (!app) throw new Error(`App "${appSlug}" not found.`);

	const deployEnvironment = await getDeployEvironmentByApp(app, env);
	if (isEmpty(deployEnvironment)) {
		throw new Error(`Deploy environment (${env}) of "${appSlug}" app not found.`);
	}

	const { registry: regSlug } = deployEnvironment;
	let registry = await DB.findOne<ContainerRegistry>("registry", { slug: regSlug });

	if (!registry) throw new Error(`Container Registry (${regSlug}) of "${appSlug}" app not found.`);

	const options: ContainerRegistrySecretOptions = {
		namespace: namespace,
		clusterShortName: clusterShortName,
		registrySlug: registry.slug,
		shouldCreateSecretInNamespace: true,
	};
	// console.log("createImagePullSecretsInNamespace > options :>> ", options);

	try {
		let imagePullSecret: { name?: string; value?: string };
		switch (registry.provider) {
			case "gcloud":
				imagePullSecret = await gcloud.createImagePullingSecret(options);
				break;

			case "digitalocean":
				imagePullSecret = await digitalocean.createImagePullingSecret(options);
				break;

			// case "custom":
			// 	imagePullSecret = await custom.createImagePullingSecret(options);
			// 	break;

			default:
				message = `This cloud provider "${registry.provider}" is not supported yet.`;
				throw new Error(message);
		}

		// console.log("imagePullSecret :>> ", imagePullSecret);

		if (imagePullSecret && imagePullSecret.name) {
			// update image pull secret name into container registry
			const [updatedRegistry] = await DB.update<ContainerRegistry>("registry", { slug: regSlug }, { imagePullSecret });
			if (!updatedRegistry) logError(`[IMAGE PULL SECRET] Can't update "imagePullSecrets" to "${regSlug}" registry`);

			// print success
			message = `Created "imagePullSecret" named "${imagePullSecret.name}" successfully.`;
			log(message);
		} else {
			const errMsg = `Something is wrong. Create "imagePullSecrets" failed.`;
			logError(errMsg);
			throw new Error(errMsg);
		}

		return imagePullSecret;
	} catch (e) {
		message = `[ERROR] Creating "imagePullSecret" failed -> ${e.toString()}`;
		throw new Error(message);
	}
}
