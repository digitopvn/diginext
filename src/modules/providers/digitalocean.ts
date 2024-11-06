import { log, logError, logWarn } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import yaml from "js-yaml";
import { isEmpty } from "lodash";
import yargs from "yargs";

import { Config } from "@/app.config";
import type { IContainerRegistry } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import type { KubeRegistrySecret } from "@/interfaces/KubeRegistrySecret";
import { wait } from "@/plugins";

import type { DomainRecord } from "../../interfaces/DomainRecord";
import { askForCluster } from "../cluster/ask-for-cluster";
import ClusterManager from "../k8s";
import { getKubeContextByCluster } from "../k8s/kube-config";
import type { ContainerRegistrySecretOptions } from "../registry/ContainerRegistrySecretOptions";

/**
 *
 * @param {InputOptions} options
 */
export const authenticate = async (options?: InputOptions) => {
	const { DB } = await import("@/modules/api/DB");
	const { execaCommand } = await import("execa");

	let API_ACCESS_TOKEN;

	if (!options.key && !options.input)
		logError(`[DIGITAL_OCEAN] API ACCESS TOKEN not found. Learn more: https://docs.digitalocean.com/reference/api/create-personal-access-token/`);

	API_ACCESS_TOKEN = options.key ? options.key : options.input;

	// authenticate Docker with this container registry
	try {
		await execaCommand(`doctl auth init --access-token ${API_ACCESS_TOKEN}`);
		return true;
	} catch (e) {
		logWarn(`[DIGITAL_OCEAN]`, e);
	}

	// wait 5s and retry 1 more time (sometime the API on DO is unreachable)
	await wait(5 * 1000);

	try {
		await execaCommand(`doctl auth init --access-token ${API_ACCESS_TOKEN}`);
		return true;
	} catch (e) {
		logError(`[DIGITAL_OCEAN]`, e);
		return false;
	}
};

/**
 * @deprecated
 */
export const createRecordInDomain = async (input: DomainRecord) => {
	logError(`[DIGITAL_OCEAN] createRecordInDomain() > This function is deprecated.`);
	return;
};

/**
 * Create DigitalOcean Container Registry image's pull secret
 */
export const createImagePullingSecret = async (options?: ContainerRegistrySecretOptions) => {
	const { execa, execaCommand, execaSync } = await import("execa");
	const { DB } = await import("@/modules/api/DB");

	// Implement create "imagePullSecret" of Digital Ocean
	const { registrySlug, clusterSlug, namespace = "default" } = options;

	if (!registrySlug) {
		logError(`[DIGITAL_OCEAN] Container Registry's slug is required.`);
		return;
	}

	if (!clusterSlug) {
		logError(`[DIGITAL_OCEAN] Cluster's short name is required.`);
		return;
	}

	// get Container Registry data:
	const registry = await DB.findOne("registry", { slug: registrySlug }, { subpath: "/all", ignorable: true });

	if (!registry) {
		logError(`[DIGITAL_OCEAN] Container Registry (${registrySlug}) not found. Please contact your admin or create a new one.`);
		return;
	}

	// Get SERVICE ACCOUNT from CONTAINER REGISTRY -> to authenticate & generate "imagePullSecrets"
	const { host, serviceAccount, provider: providerShortName } = registry;

	// Get "context" by "cluster" -> to create "imagePullSecrets" of "registry" in cluster's namespace
	const cluster = await DB.findOne("cluster", { slug: clusterSlug });
	if (!cluster) {
		logError(`[DIGITAL_OCEAN] Cluster "${clusterSlug}" not found.`);
		return;
	}

	const { name: context } = await getKubeContextByCluster(cluster);

	const secretName = `${providerShortName}-docker-registry-key`;

	const { apiAccessToken: API_ACCESS_TOKEN } = registry;

	// check namespace is existed
	const isNsExisted = await ClusterManager.isNamespaceExisted(namespace, { context });
	if (!isNsExisted) {
		// create new namespace?
		const ns = await ClusterManager.createNamespace(namespace, { context });
		// still can't create namespace -> throw error!
		if (!ns) throw new Error(`Namespace "${namespace}" is not existed on this cluster ("${clusterSlug}").`);
		return;
	}

	// create secret in the namespace (if needed)
	const applyCommand = `| kubectl apply -f -`;

	try {
		// command: "doctl registry kubernetes-manifest"
		const { stdout: registryYaml } = await execaCommand(
			`doctl registry kubernetes-manifest --context ${context} --namespace ${namespace} --name ${secretName} --access-token ${API_ACCESS_TOKEN} ${applyCommand}`
		);
		const registrySecretData = yaml.load(registryYaml) as KubeRegistrySecret;

		if (!registrySecretData) {
			logError(`[DIGITAL_OCEAN] Failed to create "imagePullSecrets" in "${namespace}" namespace of "${context}" cluster.`);
			return;
		}

		// Save to database
		const imagePullSecret = {
			name: secretName,
			value: registrySecretData.data[".dockerconfigjson"],
		};

		const [updatedRegistry] = await DB.update("registry", { slug: registrySlug }, { imagePullSecret });
		if (!updatedRegistry) logError(`[DIGITAL_OCEAN] Can't update container registry of Digital Ocean.`);
		// log(`DigitalOcean.createImagePullingSecret() :>>`, { updatedRegistry });

		return imagePullSecret;
	} catch (e: any) {
		throw new Error(`[DIGITAL_OCEAN] Error creating "imagePullSecret": ${e}`.replace(API_ACCESS_TOKEN, "***"));
	}
};

/**
 * Connect Docker to Digital Ocean Container Registry
 * @param {InputOptions} options
 */
export const connectDockerToRegistry = async (options?: InputOptions) => {
	const { execa, execaCommand, execaSync } = await import("execa");
	const { DB } = await import("@/modules/api/DB");

	const { host, key: API_ACCESS_TOKEN, userId, workspaceId, registry: registrySlug } = options;

	try {
		let connectRes;
		// connect DOCKER to CONTAINER REGISTRY
		if (API_ACCESS_TOKEN) {
			connectRes = await execaCommand(`doctl registry login --access-token ${API_ACCESS_TOKEN}`);
		} else {
			connectRes = await execaCommand(`doctl registry login`);
		}

		if (Config.BUILDER === "podman") {
			// connect PODMAN to CONTAINER REGISTRY
			connectRes = await execaCommand(`podman login`);
		}

		if (options.isDebugging) log(`[DIGITAL OCEAN] connectDockerRegistry >`, { authRes: connectRes });
	} catch (e) {
		logError(e);
		return;
	}

	const existingRegistry = await DB.findOne("registry", { slug: registrySlug }, { subpath: "/all", ignorable: true });
	if (options.isDebugging) log(`[DIGITAL OCEAN] connectDockerRegistry >`, { existingRegistry });

	if (existingRegistry) return existingRegistry;

	// IF NOT EXISTED -> Save this container registry to database!
	const registryHost = host || "registry.digitalocean.com";
	const imageBaseURL = `${registryHost}/${options.workspace?.slug || "diginext"}`;
	let newRegistry = await DB.create("registry", {
		name: "Digital Ocean Container Registry",
		provider: "digitalocean",
		host: registryHost,
		imageBaseURL,
		apiAccessToken: API_ACCESS_TOKEN,
		owner: userId,
		workspace: workspaceId,
	});

	return newRegistry;
};

export const execDigitalOcean = async (options?: InputOptions) => {
	const { secondAction } = options;
	const { DB } = await import("@/modules/api/DB");

	switch (secondAction) {
		case "auth":
			try {
				await authenticate(options);
			} catch (e) {
				logError(e);
			}
			break;

		case "connect-registry":
			try {
				await connectDockerToRegistry(options);
			} catch (e) {
				logError(e);
			}
			break;

		case "create-image-pull-secret":
			const registries = await DB.find("registry", {}, { subpath: "/all" });
			if (isEmpty(registries)) {
				logError(`[DIGITAL_OCEAN] This workspace doesn't have any registered Container Registries.`);
				return;
			}

			const { selectedRegistry } = await inquirer.prompt<{ selectedRegistry: IContainerRegistry }>({
				message: `Select the container registry:`,
				type: "list",
				choices: registries.map((reg, i) => {
					return { name: `[${i + 1}] ${reg.name} (${reg.provider})`, value: reg };
				}),
			});
			const clusterSlug = typeof options.cluster === "boolean" ? (await askForCluster()).slug : options.cluster;
			try {
				await createImagePullingSecret({
					clusterSlug,
					registrySlug: selectedRegistry.slug,
					namespace: options.namespace,
				});
			} catch (e) {
				logError(e);
			}
			break;

		default:
			yargs.showHelp();
			break;
	}
};

export default { authenticate, connectDockerRegistry: connectDockerToRegistry, createImagePullingSecret };
