import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import chalk from "chalk";
import { logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import execa from "execa";
import inquirer from "inquirer";
import yaml from "js-yaml";
import { isEmpty } from "lodash";
import yargs from "yargs";

import { DIGINEXT_DOMAIN } from "@/config/const";
import type { CloudProvider, Cluster, ContainerRegistry } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import type { KubeRegistrySecret } from "@/interfaces/KubeRegistrySecret";
import { execCmd, wait } from "@/plugins";

import type { DomainRecord } from "../../interfaces/DomainRecord";
import { DB } from "../api/DB";
import { getKubeContextByClusterShortName } from "../k8s/kube-config";
import type { ContainerRegistrySecretOptions } from "../registry/ContainerRegistrySecretOptions";

const DIGITAL_OCEAN_API_BASE_URL = `https://api.digitalocean.com/v2`;

export async function doApi(options: AxiosRequestConfig & { access_token?: string }) {
	const { access_token, method } = options;

	options.baseURL = DIGITAL_OCEAN_API_BASE_URL;

	if (isEmpty(options.headers)) options.headers = {};
	if (isEmpty(access_token)) {
		logError(`Digital Ocean API access token is required.`);
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
		logError(`Something went wrong:`, e);
		return { status: 0, messages: [`Something went wrong.`] };
	}
}

/**
 *
 * @param {InputOptions} options
 */
export const authenticate = async (options?: InputOptions) => {
	const provider = await DB.findOne<CloudProvider>("provider", { shortName: "digitalocean" });

	let API_ACCESS_TOKEN;

	if (!options.key && !options.input)
		logError(`API ACCESS TOKEN not found. Learn more: https://docs.digitalocean.com/reference/api/create-personal-access-token/`);

	API_ACCESS_TOKEN = options.key ? options.key : options.input;

	// authenticate Docker with this container registry
	let shouldRetry = false;
	try {
		await execa.command(`doctl auth init --access-token ${API_ACCESS_TOKEN}`);
		shouldRetry = false;
	} catch (e) {
		logWarn(e);
		shouldRetry = true;
	}

	if (shouldRetry) {
		// wait 5s and retry (sometime the API on DO is unreachable)
		await wait(5 * 1000);
		try {
			await execa.command(`doctl auth init --access-token ${API_ACCESS_TOKEN}`);
		} catch (e) {
			logError(e);
			return false;
		}
	}

	// Save this cloud provider to database
	if (!provider) {
		const data = {
			name: "Digital Ocean",
			shortName: "digitalocean",
			apiAccessToken: API_ACCESS_TOKEN,
			owner: options.userId,
			workspace: options.workspaceId,
		};

		// create new cloud provider if not existed
		const newProvider = await DB.create<CloudProvider>("provider", data);
		if (!newProvider) logError(`Can't create new cloud provider "digitalocean".`);
	}

	return true;
};

export const createRecordInDomain = async (input: DomainRecord) => {
	const { name, data, type = "A" } = input;

	const domain = `${name}.${DIGINEXT_DOMAIN}`;
	let record: DomainRecord;

	try {
		// get "access_token" from "Digital Ocean" cloud provider
		const doProvider = await DB.findOne<CloudProvider>("provider", { shortName: "digitalocean" });
		if (!doProvider) {
			logError(`Can't get cloud provider (Digital Ocean).`);
			return;
		}

		const { apiAccessToken: access_token } = doProvider;

		// log(`doProvider :>>`, doProvider);
		// log(`createRecordInDomain > apiAccessToken :>>`, access_token);

		// check if this record existed
		const { domain_records } = await doApi({
			url: `/domains/${DIGINEXT_DOMAIN}/records?name=${domain}`,
			access_token,
		});

		const printSuccess = () => logSuccess(`Created the domain "${domain}" successfully.`);

		// if it's existed -> check if the "data" is different:
		if (domain_records && domain_records.length > 0) {
			record = domain_records[0];

			// if the "data" is different -> update new data:
			if (record.data != data) {
				logWarn(`This domain name is existed & will be overrided.`);
				const { domain_record } = await doApi({
					url: `/domains/${DIGINEXT_DOMAIN}/records/${record.id}`,
					method: "PATCH",
					data: { data },
					access_token,
				});
				printSuccess();
				return { status: 1, domain, domain_record };
			} else {
				printSuccess();
				return { status: 1, domain, domain_record: record };
			}
		} else {
			// if the record is not existed -> create new record:
			const { domain_record } = await doApi({
				method: "POST",
				url: `/domains/${DIGINEXT_DOMAIN}/records`,
				data: JSON.stringify({ name, data, type }),
				access_token,
			});
			printSuccess();
			return { status: 1, domain, domain_record };
		}
	} catch (e) {
		logError(e);
		return { status: 0, domain, domain_record: null };
	}
};

/**
 * Create DigitalOcean Container Registry image's pull secret
 */
export const createImagePullingSecret = async (options?: ContainerRegistrySecretOptions) => {
	// Implement create "imagePullingSecret" of Digital Ocean
	const { registrySlug, clusterShortName, namespace = "default", shouldCreateSecretInNamespace = false } = options;

	if (!registrySlug) {
		logError(`Container Registry's slug is required.`);
		return;
	}

	if (!clusterShortName) {
		logError(`Cluster's short name is required.`);
		return;
	}

	// get Service Account data:
	const cluster = await DB.findOne<Cluster>("cluster", { shortName: clusterShortName });
	if (!cluster) {
		logError(`Cluster "${clusterShortName}" not found.`);
		return;
	}
	const { providerShortName } = cluster;
	const { name: context } = await getKubeContextByClusterShortName(clusterShortName, providerShortName);

	const secretName = `${providerShortName}-docker-registry-key`;

	if (shouldCreateSecretInNamespace && namespace == "default") {
		logWarn(
			`You are creating "imagePullSecrets" in "default" namespace, if you want to create in other namespaces:`,
			chalk.cyan("\n  dx registry allow --create --provider=digitalocean --namespace=") + "<CLUSTER_NAMESPACE_NAME>",
			chalk.gray(`\n  # Examples / alias:`),
			"\n  dx registry allow --create --provider=digitalocean --namespace=my-website-namespace",
			"\n  dx registry allow --create --do create -n my-website-namespace"
		);
	}

	// create secret in the namespace (if needed)
	const applyCommand = shouldCreateSecretInNamespace ? `| kubectl apply -f -` : "";

	// command: "doctl registry kubernetes-manifest"
	const registryYaml = await execCmd(
		`doctl registry kubernetes-manifest --context ${context} --namespace ${namespace} --name ${secretName} ${applyCommand}`
	);
	const registrySecretData = yaml.load(registryYaml) as KubeRegistrySecret;

	// Save to database
	const imagePullingSecret = {
		name: secretName,
		value: registrySecretData.data[".dockerconfigjson"],
	};

	const [updatedRegistry] = await DB.update<ContainerRegistry>("registry", { slug: registrySlug }, { imagePullingSecret });
	if (!updatedRegistry) logError(`[API] Can't update container registry of Digital Ocean.`);
	// log(`DigitalOcean.createImagePullingSecret() :>>`, { updatedRegistry });

	return imagePullingSecret;
};

/**
 * Connect Docker to Digital Ocean Container Registry
 * @param {InputOptions} options
 */
export const connectDockerRegistry = async (options?: InputOptions) => {
	if (!options.cluster) {
		logError(`Cluster's short name is required. ("--cluster" flag)`);
		return;
	}
	try {
		await execa.command(`doctl registry login`);
	} catch (e) {
		logError(e);
		return false;
	}

	// Save this container registry to database
	let currentRegistry = await DB.create<ContainerRegistry>("registry", {
		name: "Digital Ocean Container Registry",
		host: "registry.digitalocean.com",
		provider: "digitalocean",
		owner: options.userId,
		workspace: options.workspaceId,
	});

	await createImagePullingSecret({
		clusterShortName: options.cluster,
		registrySlug: currentRegistry.slug,
		shouldCreateSecretInNamespace: false,
	});

	// save registry to local config:
	// saveCliConfig({ currentRegistry });

	logSuccess(`Connected to DigitalOcean Container Registry!`);

	return currentRegistry;
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
				await connectDockerRegistry(options);
			} catch (e) {
				logError(e);
			}
			break;

		case "create-image-pull-secret":
			const registries = await DB.find<ContainerRegistry>("registry", {});
			if (isEmpty(registries)) {
				logError(`This workspace doesn't have any registered Container Registries.`);
				return;
			}

			const { selectedRegistry } = await inquirer.prompt<{ selectedRegistry: ContainerRegistry }>({
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

export default { authenticate, connectDockerRegistry, createImagePullingSecret };
