import chalk from "chalk";
import { log, logError, logWarn } from "diginext-utils/dist/console/log";
import execa from "execa";
import fs from "fs";
import { isEmpty } from "lodash";
import path from "path";
import yargs from "yargs";

import { isServerMode } from "@/app.config";
import { cliOpts, getCliConfig, saveCliConfig } from "@/config/config";
import { CLI_CONFIG_DIR } from "@/config/const";
import type { CloudProvider, ContainerRegistry } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import { fetchApi } from "@/modules/api/fetchApi";
import { execCmd } from "@/plugins";
import { CloudProviderService, ContainerRegistryService } from "@/services";

import ClusterManager from "../k8s";
import type { ContainerRegistrySecretOptions } from "../registry/ContainerRegistrySecretOptions";

/**
 * Authenticate Google Cloud
 */
export const authenticate = async (options?: InputOptions) => {
	if (!options.filePath) {
		logError(`Param "filePath" is required.`);
		return false;
	}

	const serviceAccountPath = options.filePath;

	// const containerRegistryUrl = options.host || "asia.gcr.io";

	if (!fs.existsSync(serviceAccountPath))
		logError(`Service account file not found. Try: "diginext gcloud auth -f /path/to/gcloud-service-account.json"`);

	try {
		// authenticate Google Cloud platform with Service Account file
		await execCmd(`gcloud auth activate-service-account --key-file ${serviceAccountPath}`);

		// authenticate Docker with Google Cloud platform
		// await execCmd(`gcloud auth configure-docker ${containerRegistryUrl} --quiet`);
	} catch (e) {
		logError(e);
		return false;
	}

	// Save this cloud provider to database
	const serviceAccount = fs.readFileSync(serviceAccountPath, "utf8");

	if (isServerMode) {
		const providerSvc = new CloudProviderService();
		const gcloud = await providerSvc.findOne({ shortName: "gcloud" });

		// not support multiple cloud providers yet!
		if (!gcloud) {
			const newProvider = await providerSvc.create({
				name: "Google Cloud",
				shortName: "gcloud",
				serviceAccount: serviceAccount,
				owner: options.userId,
				workspace: options.workspaceId,
			});
		}
	} else {
		const { status, messages } = await fetchApi<CloudProvider>({
			url: `/api/v1/provider`,
			method: "POST",
			data: {
				name: "Google Cloud",
				shortName: "gcloud",
				serviceAccount: serviceAccount,
				owner: options.userId,
				workspace: options.workspaceId,
			},
		});
		if (status === 0) logError(`Can't save this cloud provider (Google Cloud) to database:`, messages.join(". "));
	}

	return true;
};

/**
 * Connect Docker to Google Cloud Registry
 */
export const connectDockerRegistry = async (options?: InputOptions) => {
	if (!options.host) {
		logWarn(`You should specify your Google Registry host with`, chalk.cyan("diginext gcloud registry connect --host"), `<GCP_HOST_URL>`);
		logWarn(`Learn more: https://cloud.google.com/container-registry/docs/advanced-authentication`);
	}

	try {
		if (options.host) {
			await execa.command(`gcloud auth configure-docker ${options.host} --quiet`);
		} else {
			await execa.command(`gcloud auth configure-docker --quiet`);
		}
	} catch (e) {
		logError(e);
		return false;
	}

	// save this container registry to database
	let currentRegistry, existed;
	if (isServerMode) {
		const registrySvc = new ContainerRegistryService();
		existed = await registrySvc.findOne({ provider: "gcloud", host: options.host });

		currentRegistry = existed
			? existed
			: await registrySvc.create({
					name: "Google Container Registry",
					host: options.host || "asia.gcr.io",
					provider: "gcloud",
					owner: options.userId,
					workspace: options.workspaceId,
			  });
	} else {
		const { currentUser, currentWorkspace } = getCliConfig();
		const { data: regs } = await fetchApi<ContainerRegistry>({ url: `/api/v1/registry?provider=gcloud&host=${options.host}` });
		if (isEmpty(regs)) {
			const { status, data, messages } = await fetchApi<ContainerRegistry>({
				url: `/api/v1/registry`,
				method: "POST",
				data: {
					name: "Google Container Registry",
					host: options.host || "asia.gcr.io",
					provider: "gcloud",
					owner: currentUser._id,
					workspace: currentWorkspace._id,
				},
			});
			if (!data) return;
			currentRegistry = data;
		} else {
			currentRegistry = regs[0];
		}
	}

	// save registry to local config:
	// saveCliConfig({ currentRegistry });
	// logSuccess(`[] Connected to Google Container Registry at "${options.host || "asia.gcr.io"}"`);

	return currentRegistry;
};

/**
 * Create Google Container Registry image pulling secret
 */
export const createImagePullingSecret = async (options?: ContainerRegistrySecretOptions) => {
	const { registrySlug, providerShortName, namespace = "default", shouldCreateSecretInNamespace = false } = options;
	// log(`providerShortName :>>`, providerShortName);

	// get Container Registry data:
	let registry, registrySvc;
	if (isServerMode) {
		registrySvc = new ContainerRegistryService();
		registry = await registrySvc.findOne({ slug: registrySlug });
	} else {
		const { data: registries } = await fetchApi<ContainerRegistry>({ url: `/api/v1/registry?slug=${registrySlug}` });
		registry = registries[0];
		// const [registry] = registries as ContainerRegistry[];
	}

	if (isEmpty(registry)) {
		logError(`Container Registry (${registrySlug}) not found. Please contact your admin or create a new one.`);
		return;
	}

	const { host } = registry;

	// get Service Account data:
	let provider;
	if (isServerMode) {
		const providerSvc = new CloudProviderService();
		provider = await providerSvc.findOne({ shortName: providerShortName });
	} else {
		const { data: gcloudProviders } = await fetchApi<CloudProvider>({ url: `/api/v1/provider?shortName=${providerShortName}` });
		provider = gcloudProviders[0];
		// const [provider] = gcloudProviders as CloudProvider[];
	}

	if (isEmpty(provider)) {
		logError(`No Google Cloud (short name: "${providerShortName}") provider found. Please contact your admin or create a new one.`);
		return;
	}

	const { serviceAccount } = provider;

	// write down the service account file:
	const serviceAccountPath = path.resolve(CLI_CONFIG_DIR, `${providerShortName}-service-account.json`);
	if (fs.existsSync(serviceAccountPath)) fs.unlinkSync(serviceAccountPath);
	fs.writeFileSync(serviceAccountPath, serviceAccount, "utf8");

	if (shouldCreateSecretInNamespace && namespace == "default") {
		logWarn(
			`You are creating "imagePullSecrets" in "default" namespace, if you want to create in other namespaces:`,
			chalk.cyan("\n  dx registry allow --create --provider=<REGISTRY_PROVIDER> --namespace=") + "<CLUSTER_NAMESPACE_NAME>",
			chalk.gray(`\n  # Examples / alias:`),
			"\n  dx registry allow --create --provider=gcloud --namespace=my-website-namespace",
			"\n  dx registry allow --create --gcloud create -n my-website-namespace"
		);
	}

	// const namespace = options.namespace ?? "default";

	// return logError(`No container registries found. \nPlease create new one with: "dx registry connect --provider=gcloud [--host=asia.gcr.io]"`);

	let secretValue;
	const secretName = `${providerShortName}-docker-registry-key`;
	const currentCluster = await ClusterManager.currentCluster();

	// check if namespace is existed
	if (shouldCreateSecretInNamespace) {
		await execCmd(`kubectl get ns ${namespace}`, `Namespace "${namespace}" is not existed on this cluster ("${currentCluster}").`);
	}

	// check if the secret is existed within the namespace, try to delete it!
	try {
		// await execa.command(`kubectl -n ${namespace} get secret ${secretName} -o json`, cliOpts);
		await execa.command(`kubectl -n ${namespace} delete secret ${secretName}`, cliOpts);
	} catch (e) {
		// if not, ignore!
	}

	// create new image pulling secret (in namespace & in database)
	try {
		// Create new "imagePullingSecret":
		const { stdout: newImagePullingSecret } = await execa.command(
			`kubectl -n ${namespace} create secret docker-registry ${secretName} --docker-server=${host} --docker-username=_json_key --docker-password="$(cat ${serviceAccountPath})" -o json`,
			cliOpts
		);
		secretValue = JSON.parse(newImagePullingSecret).data[".dockerconfigjson"];
		// log({ secretValue });

		// save this secret to database:
		let updatedRegistry,
			updateData = {
				"imagePullingSecret[name]": secretName,
				"imagePullingSecret[value]": secretValue,
			};

		if (isServerMode) {
			const updatedRegistries = await registrySvc.update({ provider: providerShortName }, updateData);
			if (updatedRegistries && updatedRegistries.length > 0) updatedRegistry = updatedRegistries[0];
		} else {
			const { status, data } = await fetchApi<ContainerRegistry>({
				url: `/api/v1/registry?provider=${providerShortName}`,
				method: "PATCH",
				data: updateData,
			});
			if (!status) return;
			updatedRegistry = data[0];

			// save registry to local config:
			saveCliConfig({ currentRegistry: updatedRegistry });
		}

		// console.log(JSON.stringify(updatedRegistry.imagePullingSecret, null, 2));
		log(`gcloud.createImagePullingSecret() :>>`, { updatedRegistry });

		return updatedRegistry.imagePullingSecret;
	} catch (e) {
		logError(`Cannot create image pull secret:`, e);
		return null;
	}
};

export const showHelp = (options?: InputOptions) => {
	log(`GCLOUD > Available commands:`);
	log(`	diginext gcloud auth`);
	log(`	diginext gcloud auth -f`, chalk.cyan(`/path/to/gcloud-service-account.json`));

	log(``);
	log(`	diginext gcloud registry connect`);
	log(`	diginext gcloud registry connect --host`, chalk.cyan("<GOOGLE_CONTAINER_REGISTRY_HOST>"));

	log(``);
	log(
		`	diginext gcloud registry-secret create -f`,
		chalk.cyan(`/path/to/gcloud-service-account.json`),
		"--namespace",
		chalk.cyan("<CLUSTER_NAMESPACE_NAME>")
	);

	log(``);
	log(`Learn more:`);
	log(`	- What is service account: https://cloud.google.com/iam/docs/service-accounts`);
	log(`	- Authentication at Google: https://cloud.google.com/docs/authentication#service-accounts`);
};

export const execGoogleCloud = async (options?: InputOptions) => {
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
			try {
				await createImagePullingSecret(options);
			} catch (e) {
				logError(e);
			}
			break;

		default:
			yargs.showHelp();
			break;
	}
};

export default { authenticate, connectDockerRegistry, createImagePullingSecret, showHelp };
