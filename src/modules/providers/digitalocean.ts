import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import chalk from "chalk";
import { logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import execa from "execa";
import yaml from "js-yaml";
import { isEmpty } from "lodash";
import yargs from "yargs";

import { isServerMode } from "@/app.config";
import { DIGINEXT_DOMAIN } from "@/config/const";
import type { CloudProvider, ContainerRegistry } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import type { KubeRegistrySecret } from "@/interfaces/KubeRegistrySecret";
import { execCmd, wait } from "@/plugins";
import { CloudProviderService } from "@/services";

import type { DomainRecord } from "../../interfaces/DomainRecord";
import { fetchApi } from "../api/fetchApi";
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
	// Not support multiple "Digital Ocean" providers yet!
	let provider, providerSvc: CloudProviderService;

	if (isServerMode) {
		providerSvc = new CloudProviderService();
		provider = await providerSvc.findOne({ shortName: "digitalocean" });
	} else {
		const { data: providers } = await fetchApi<CloudProvider>({ url: `/api/v1/provider?shortName=digitalocean` });
		if ((providers as CloudProvider[]).length == 1) {
			logWarn(`Digital Ocean provider is existed. Multiple "Digital Ocean" providers are not supported yet.`);
		}
		provider = providers[0];
	}

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

	// Check if this cloud provider is existed:
	// const {
	// 	data: [provider],
	// } = await fetchApi<CloudProvider>({ url: `/api/v1/provider?apiAccessToken=${API_ACCESS_TOKEN}` });

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
		if (isServerMode) {
			const newProvider = await providerSvc.create(data);
			if (!newProvider) logError(`Can't create new cloud provider "digitalocean"`);
		} else {
			const { status, messages } = await fetchApi<CloudProvider>({
				url: `/api/v1/provider`,
				method: "POST",
				data,
			});
			if (status === 0) logError(`Can't save this Cloud Provider to database:`, messages.join(". "));
		}
	}

	return true;
};

export const createRecordInDomain = async (input: DomainRecord) => {
	const { name, data, type = "A" } = input;

	const domain = `${name}.${DIGINEXT_DOMAIN}`;
	let record: DomainRecord;

	try {
		// get "access_token" from "Digital Ocean" cloud provider
		const { status, data: providers, messages } = await fetchApi<CloudProvider>({ url: "/api/v1/provider?shortName=digitalocean" });

		if (status === 0 || isEmpty(providers)) {
			logError(`Can't get cloud provider (Digital Ocean):`, messages.join(". "));
			return;
		}

		const doProvider = (providers as CloudProvider[])[0];
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
	const { registrySlug, providerShortName, namespace = "default", shouldCreateSecretInNamespace = false } = options;
	// const { name, namespace = "default", providerShortName, shouldCreateSecretInNamespace = false } = options;
	const secretName = `${providerShortName}-docker-registry-key`;

	// get Service Account data:
	const { data: gcloudProviders } = await fetchApi<CloudProvider>({ url: `/api/v1/provider?shortName=${providerShortName}` });
	if (isEmpty(gcloudProviders)) {
		logError(`No Google Cloud (short name: "${providerShortName}") provider found. Please contact your admin or create a new one.`);
		return;
	}
	// const [provider] = gcloudProviders as CloudProvider[];
	// const { serviceAccount } = provider;

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
	const registryYaml = await execCmd(`doctl registry kubernetes-manifest --namespace ${namespace} --name ${secretName} ${applyCommand}`);
	const registrySecretData = yaml.load(registryYaml) as KubeRegistrySecret;

	// Save to database
	const { status, data: currentRegistry } = await fetchApi<ContainerRegistry>({
		url: `/api/v1/registry?provider=digitalocean`,
		method: "PATCH",
		data: {
			"imagePullingSecret[name]": secretName,
			"imagePullingSecret[value]": registrySecretData.data[".dockerconfigjson"],
		},
	});

	return registrySecretData;
};

/**
 * Connect Docker to Digital Ocean Container Registry
 * @param {InputOptions} options
 */
export const connectDockerRegistry = async (options?: InputOptions) => {
	try {
		await execa.command(`doctl registry login`);
	} catch (e) {
		logError(e);
		return false;
	}

	// Save this container registry to database
	const { status, data: currentRegistry } = await fetchApi<ContainerRegistry>({
		url: `/api/v1/registry`,
		method: "POST",
		data: {
			name: "Digital Ocean Container Registry",
			host: "registry.digitalocean.com",
			provider: "digitalocean",
			owner: options.userId,
			workspace: options.workspaceId,
		},
	});

	await createImagePullingSecret({ ...options, shouldCreateSecretInNamespace: false });

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
		default:
			yargs.showHelp();
			break;
	}
};

export default { authenticate, connectDockerRegistry, createImagePullingSecret };
