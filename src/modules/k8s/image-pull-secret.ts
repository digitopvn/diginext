import { log, logError } from "diginext-utils/dist/xconsole/log";
import { isEmpty } from "lodash";

import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import digitalocean from "../providers/digitalocean";
import gcloud from "../providers/gcloud";
import type { ContainerRegistrySecretOptions } from "../registry/ContainerRegistrySecretOptions";
import DockerRegistry from "../registry/docker-registry";

/**
 * Create imagePullSecrets in a namespace
 * @param appSlug - App's slug
 * @param env @example "dev", "prod"
 * @param clusterSlug - Cluster's slug
 * @param namespace @default "default"
 */
export async function createImagePullSecretsInNamespace(appSlug: string, env: string, clusterSlug: string, namespace: string = "default") {
	const { DB } = await import("@/modules/api/DB");
	let message = "";

	let app = await DB.findOne("app", { slug: appSlug });

	if (!app) throw new Error(`App "${appSlug}" not found.`);

	const deployEnvironment = await getDeployEvironmentByApp(app, env);
	if (isEmpty(deployEnvironment)) {
		throw new Error(`Deploy environment (${env}) of "${appSlug}" app not found.`);
	}

	const { registry: regSlug } = deployEnvironment;
	let registry = await DB.findOne("registry", { slug: regSlug });

	if (!registry) throw new Error(`Container Registry (${regSlug}) of "${appSlug}" app not found.`);
	const registrySlug = registry.slug;

	const options: ContainerRegistrySecretOptions = {
		namespace,
		clusterSlug,
		registrySlug,
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

			case "dockerhub":
				imagePullSecret = await DockerRegistry.createImagePullSecret(options);
				break;

			default:
				message = `This cloud provider "${registry.provider}" is not supported yet.`;
				throw new Error(message);
		}

		// console.log("imagePullSecret :>> ", imagePullSecret);

		if (imagePullSecret && imagePullSecret.name) {
			// update image pull secret name into container registry
			const [updatedRegistry] = await DB.update("registry", { slug: regSlug }, { imagePullSecret });
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
