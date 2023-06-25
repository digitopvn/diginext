import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import { log, logError, logWarn } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import yaml from "js-yaml";
import { isEmpty } from "lodash";
import yargs from "yargs";

import { Config } from "@/app.config";
import type { ICloudProvider, ICluster, IContainerRegistry } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import type { KubeRegistrySecret } from "@/interfaces/KubeRegistrySecret";
import { wait } from "@/plugins";

import type { DomainRecord } from "../../interfaces/DomainRecord";
import { DB } from "../api/DB";
import ClusterManager from "../k8s";
import { getKubeContextByCluster } from "../k8s/kube-config";
import type { ContainerRegistrySecretOptions } from "../registry/ContainerRegistrySecretOptions";

const DIGITAL_OCEAN_API_BASE_URL = `https://api.digitalocean.com/v2`;

export async function doApi(options: AxiosRequestConfig & { access_token?: string }) {
	const { access_token, method } = options;

	options.baseURL = DIGITAL_OCEAN_API_BASE_URL;

	if (isEmpty(options.headers)) options.headers = {};
	if (!access_token) {
		logError(`[DIGITAL_OCEAN] Digital Ocean API access token is required.`);
		return;
	}

	options.headers.Authorization = `Bearer ${access_token}`;

	if (["POST", "PATCH", "DELETE"].includes(method?.toUpperCase())) {
		if (isEmpty(options.headers["content-type"])) options.headers["content-type"] = "application/json";
	}

	// if (options.data) options.data = new URLSearchParams(options.data);
	// log(`doApi: ${options.url} > options.headers :>>`, options.headers);

	try {
		const { data: responseData } = await axios(options);
		// log(`doApi > responseData :>>`, responseData);
		return responseData;
	} catch (e) {
		logError(`[DIGITAL_OCEAN] Something went wrong:`, e);
		return { status: 0, messages: [`Something went wrong.`] };
	}
}

/**
 *
 * @param {InputOptions} options
 */
export const authenticate = async (options?: InputOptions) => {
	const provider = await DB.findOne<ICloudProvider>("provider", { shortName: "digitalocean" });
	const { execa, execaCommand, execaSync } = await import("execa");

	let API_ACCESS_TOKEN;

	if (!options.key && !options.input)
		logError(`[DIGITAL_OCEAN] API ACCESS TOKEN not found. Learn more: https://docs.digitalocean.com/reference/api/create-personal-access-token/`);

	API_ACCESS_TOKEN = options.key ? options.key : options.input;

	// authenticate Docker with this container registry
	let shouldRetry = false;
	try {
		await execaCommand(`doctl auth init --access-token ${API_ACCESS_TOKEN}`);
		shouldRetry = false;
	} catch (e) {
		logWarn(`[DIGITAL_OCEAN]`, e);
		shouldRetry = true;
	}

	if (shouldRetry) {
		// wait 5s and retry (sometime the API on DO is unreachable)
		await wait(5 * 1000);
		try {
			await execaCommand(`doctl auth init --access-token ${API_ACCESS_TOKEN}`);
		} catch (e) {
			logError(`[DIGITAL_OCEAN]`, e);
			return false;
		}
	}

	return true;
};

export const createRecordInDomain = async (input: DomainRecord) => {
	logError(`[DIGITAL_OCEAN] createRecordInDomain() > This function is deprecated.`);
	return;
	// const { name, data, type = "A" } = input;

	// const domain = `${name}.${DIGINEXT_DOMAIN}`;
	// let record: DomainRecord;

	// try {
	// 	// get "access_token" from "Digital Ocean" cloud provider
	// 	const doProvider = await DB.findOne<CloudProvider>("provider", { shortName: "digitalocean" });
	// 	if (!doProvider) {
	// 		logError(`Can't get cloud provider (Digital Ocean).`);
	// 		return;
	// 	}

	// 	const { apiAccessToken: access_token } = doProvider;

	// 	// check if this record existed
	// 	const { domain_records } = await doApi({
	// 		url: `/domains/${DIGINEXT_DOMAIN}/records?name=${domain}`,
	// 		access_token,
	// 	});

	// 	const printSuccess = () => logSuccess(`Created the domain "${domain}" successfully.`);

	// 	// if it's existed -> check if the "data" is different:
	// 	if (domain_records && domain_records.length > 0) {
	// 		record = domain_records[0];

	// 		// if the "data" is different -> update new data:
	// 		if (record.data != data) {
	// 			logWarn(`This domain name is existed & will be overrided.`);
	// 			const { domain_record } = await doApi({
	// 				url: `/domains/${DIGINEXT_DOMAIN}/records/${record.id}`,
	// 				method: "PATCH",
	// 				data: { data },
	// 				access_token,
	// 			});
	// 			printSuccess();
	// 			return { status: 1, domain, domain_record };
	// 		} else {
	// 			printSuccess();
	// 			return { status: 1, domain, domain_record: record };
	// 		}
	// 	} else {
	// 		// if the record is not existed -> create new record:
	// 		const { domain_record } = await doApi({
	// 			method: "POST",
	// 			url: `/domains/${DIGINEXT_DOMAIN}/records`,
	// 			data: JSON.stringify({ name, data, type }),
	// 			access_token,
	// 		});
	// 		printSuccess();
	// 		return { status: 1, domain, domain_record };
	// 	}
	// } catch (e) {
	// 	logError(e);
	// 	return { status: 0, domain, domain_record: null };
	// }
};

/**
 * Create DigitalOcean Container Registry image's pull secret
 */
export const createImagePullingSecret = async (options?: ContainerRegistrySecretOptions) => {
	const { execa, execaCommand, execaSync } = await import("execa");
	// Implement create "imagePullSecret" of Digital Ocean
	const { registrySlug, clusterShortName, namespace = "default" } = options;

	if (!registrySlug) {
		logError(`[DIGITAL_OCEAN] Container Registry's slug is required.`);
		return;
	}

	if (!clusterShortName) {
		logError(`[DIGITAL_OCEAN] Cluster's short name is required.`);
		return;
	}

	// get Container Registry data:
	const registry = await DB.findOne<IContainerRegistry>("registry", { slug: registrySlug });

	if (!registry) {
		logError(`[DIGITAL_OCEAN] Container Registry (${registrySlug}) not found. Please contact your admin or create a new one.`);
		return;
	}

	// Get SERVICE ACCOUNT from CONTAINER REGISTRY -> to authenticate & generate "imagePullSecrets"
	const { host, serviceAccount, provider: providerShortName } = registry;

	// Get "context" by "cluster" -> to create "imagePullSecrets" of "registry" in cluster's namespace
	const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
	if (!cluster) {
		logError(`[DIGITAL_OCEAN] Cluster "${clusterShortName}" not found.`);
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
		if (!ns) throw new Error(`Namespace "${namespace}" is not existed on this cluster ("${clusterShortName}").`);
		return;
	}

	// create secret in the namespace (if needed)
	const applyCommand = `| kubectl apply -f -`;

	// command: "doctl registry kubernetes-manifest"
	const registryYaml = await execaCommand(
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

	const [updatedRegistry] = await DB.update<IContainerRegistry>("registry", { slug: registrySlug }, { imagePullSecret });
	if (!updatedRegistry) logError(`[DIGITAL_OCEAN] Can't update container registry of Digital Ocean.`);
	// log(`DigitalOcean.createImagePullingSecret() :>>`, { updatedRegistry });

	return imagePullSecret;
};

/**
 * Connect Docker to Digital Ocean Container Registry
 * @param {InputOptions} options
 */
export const connectDockerToRegistry = async (options?: InputOptions) => {
	const { execa, execaCommand, execaSync } = await import("execa");

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

	const existingRegistry = await DB.findOne<IContainerRegistry>("registry", { slug: registrySlug });
	if (options.isDebugging) log(`[DIGITAL OCEAN] connectDockerRegistry >`, { existingRegistry });

	if (existingRegistry) return existingRegistry;

	// IF NOT EXISTED -> Save this container registry to database!
	const registryHost = host || "registry.digitalocean.com";
	const imageBaseURL = `${registryHost}/${options.workspace?.slug || "diginext"}`;
	let newRegistry = await DB.create<IContainerRegistry>("registry", {
		name: "Digital Ocean Container Registry",
		provider: "digitalocean",
		host: registryHost,
		imageBaseURL,
		apiAccessToken: API_ACCESS_TOKEN,
		owner: userId,
		workspace: workspaceId,
	});

	// await createImagePullingSecret({
	// 	clusterShortName: options.cluster,
	// 	registrySlug: currentRegistry.slug,
	// 	shouldCreateSecretInNamespace: false,
	// });

	// save registry to local config:
	// saveCliConfig({ currentRegistry });

	return newRegistry;
};

export const execDigitalOcean = async (options?: InputOptions) => {
	const { secondAction } = options;

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
			const registries = await DB.find<IContainerRegistry>("registry", {});
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

			try {
				await createImagePullingSecret({
					clusterShortName: options.cluster,
					registrySlug: selectedRegistry.slug,
					namespace: options.namespace,
					shouldCreateSecretInNamespace: options.shouldCreate,
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