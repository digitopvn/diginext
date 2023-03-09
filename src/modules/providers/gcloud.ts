import chalk from "chalk";
import { log, logError, logWarn } from "diginext-utils/dist/console/log";
import execa from "execa";
import fs, { readFileSync } from "fs";
import inquirer from "inquirer";
import { isEmpty } from "lodash";
import path from "path";
import yargs from "yargs";

import { isServerMode } from "@/app.config";
import { cliOpts, saveCliConfig } from "@/config/config";
import { CLI_CONFIG_DIR } from "@/config/const";
import type { CloudProvider, Cluster, ContainerRegistry } from "@/entities";
import type { GoogleServiceAccount } from "@/interfaces/GoogleServiceAccount";
import type { InputOptions } from "@/interfaces/InputOptions";
import { execCmd } from "@/plugins";

import { DB } from "../api/DB";
import ClusterManager from "../k8s";
import { getKubeContextByCluster } from "../k8s/kube-config";
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
	const gcloud = await DB.findOne<CloudProvider>("provider", { shortName: "gcloud" });

	// not support multiple cloud providers yet!
	if (!gcloud) {
		const newProvider = DB.create<CloudProvider>("provider", {
			name: "Google Cloud",
			shortName: "gcloud",
			serviceAccount: serviceAccount,
			owner: options.userId,
			workspace: options.workspaceId,
		});
		if (!newProvider) logError(`Can't save this cloud provider (Google Cloud) to database.`);
	}

	return true;
};

/**
 * Connect Docker to Google Cloud Registry
 */
export const connectDockerRegistry = async (options?: InputOptions) => {
	const { host, filePath, userId, workspaceId } = options;

	// Validation
	if (!host) {
		logWarn(
			`[GCLOUD] You should specify your Google Registry host with`,
			chalk.cyan("diginext gcloud registry connect --host"),
			`<GCP_HOST_URL>`
		);
		logWarn(`[GCLOUD] Learn more: https://cloud.google.com/container-registry/docs/advanced-authentication`);
	}

	// if Service Account (JSON) file is specified as "filePath" (--file / -f)
	let serviceAccountContent = "";
	let serviceAccountObject: GoogleServiceAccount;
	if (filePath) {
		const authRes = await authenticate({ ...options, filePath });
		if (!authRes) {
			logError(`[GCLOUD] Failed to authenticate Google Cloud with service account (json)`);
			return;
		}
		serviceAccountContent = readFileSync(filePath, "utf8");
		serviceAccountObject = JSON.parse(serviceAccountContent);
	}

	//
	try {
		let connectRes;
		if (host) {
			connectRes = await execCmd(`gcloud auth configure-docker ${options.host} --quiet`);
		} else {
			connectRes = await execCmd(`gcloud auth configure-docker --quiet`);
		}
		if (options.isDebugging) log(`[GCLOUD] connectDockerRegistry >`, { authRes: connectRes });
	} catch (e) {
		logError(`[GCLOUD]`, e);
		return;
	}

	const existingRegistry = await DB.findOne<ContainerRegistry>("registry", { provider: "gcloud", host: options.host });
	if (options.isDebugging) log(`[GCLOUD] connectDockerRegistry >`, { existingRegistry });

	if (existingRegistry) return existingRegistry;

	// save this container registry to database
	const registryHost = host || "asia.gcr.io";
	const imageBaseURL = `${registryHost}/${serviceAccountObject.project_id}`;
	const newRegistry = await DB.create<ContainerRegistry>("registry", {
		name: "Google Container Registry",
		host: registryHost,
		provider: "gcloud",
		owner: userId,
		workspace: workspaceId,
		imageBaseURL,
		serviceAccount: serviceAccountContent,
	});

	return newRegistry;
};

/**
 * Create Google Container Registry image pulling secret
 */
export const createImagePullingSecret = async (options?: ContainerRegistrySecretOptions) => {
	const { registrySlug, namespace = "default", shouldCreateSecretInNamespace = false, clusterShortName } = options;
	// log(`providerShortName :>>`, providerShortName);

	if (isEmpty(clusterShortName)) {
		logError(`Cluster's short name is required.`);
		return;
	}

	// get Container Registry data:
	const registry = await DB.findOne<ContainerRegistry>("registry", { slug: registrySlug });

	if (isEmpty(registry)) {
		logError(`Container Registry (${registrySlug}) not found. Please contact your admin or create a new one.`);
		return;
	}

	// Get SERVICE ACCOUNT from CONTAINER REGISTRY -> to authenticate & generate "imagePullSecrets"
	const { host, serviceAccount, provider: providerShortName } = registry;

	console.log(":>>>>>>>>>>>>>> 1 ");

	// Get "context" by "cluster" -> to create "imagePullSecrets" of "registry" in cluster's namespace
	const cluster = await DB.findOne<Cluster>("cluster", { shortName: clusterShortName });
	if (isEmpty(cluster)) {
		logError(`Can't create "imagePullSecrets" in "${namespace}" namespace of "${clusterShortName}" cluster.`);
		return;
	}

	const { name: context } = await getKubeContextByCluster(cluster);

	console.log(":>>>>>>>>>>>>>> 2 ");

	console.log("context :>> ", context);
	console.log("serviceAccount :>> ", serviceAccount);

	// write down the service account file:
	const serviceAccountPath = path.resolve(CLI_CONFIG_DIR, `${providerShortName}-service-account.json`);
	console.log("serviceAccountPath :>> ", serviceAccountPath);

	if (fs.existsSync(serviceAccountPath)) fs.unlinkSync(serviceAccountPath);
	fs.writeFileSync(serviceAccountPath, serviceAccount, "utf8");

	console.log(":>>>>>>>>>>>>>> 3 ");

	if (shouldCreateSecretInNamespace && namespace == "default") {
		logWarn(
			`You are creating "imagePullSecrets" in "default" namespace, if you want to create in other namespaces:`,
			chalk.cyan("\n  dx registry allow --create --provider=<REGISTRY_PROVIDER> --namespace=") + "<CLUSTER_NAMESPACE_NAME>",
			chalk.gray(`\n  # Examples / alias:`),
			"\n  dx registry allow --create --provider=gcloud --namespace=my-website-namespace",
			"\n  dx registry allow --create --gcloud create -n my-website-namespace"
		);
	}

	let secretValue: string;
	const secretName = `${providerShortName}-docker-registry-key`;
	console.log("secretName :>> ", secretName);

	console.log(":>>>>>>>>>>>>>> 4 ");

	// check if namespace is existed
	if (shouldCreateSecretInNamespace) {
		const isNsExisted = await ClusterManager.isNamespaceExisted(namespace, { context });
		if (!isNsExisted) {
			logError(`Namespace "${namespace}" is not existed on this cluster ("${clusterShortName}").`);
			return;
		}
	}

	// check if the secret is existed within the namespace, try to delete it!
	const isSecretExisted = await ClusterManager.isSecretExisted(secretName, namespace, { context });
	if (isSecretExisted) await ClusterManager.deleteSecret(secretName, namespace, { context });

	console.log(":>>>>>>>>>>>>>> 5 ");

	// Create new "imagePullingSecret":
	const { stdout: newImagePullingSecret } = await execa.command(
		`kubectl ${
			context ? `--context=${context} ` : ""
		}-n ${namespace} create secret docker-registry ${secretName} --docker-server=${host} --docker-username=_json_key --docker-password="$(cat ${serviceAccountPath})" -o json`,
		cliOpts
	);

	console.log(":>>>>>>>>>>>>>> 6 ");

	console.log("GCLOUD > createImagePullingSecret > newImagePullingSecret :>> ", newImagePullingSecret);

	// create new image pulling secret (in namespace & in database)
	try {
		secretValue = JSON.parse(newImagePullingSecret).data[".dockerconfigjson"];
		// log({ secretValue });

		// save this secret to database:
		let updateData = {
			"imagePullingSecret[name]": secretName,
			"imagePullingSecret[value]": secretValue,
		};

		const updatedRegistries = await DB.update<ContainerRegistry>("registry", { provider: providerShortName }, updateData as ContainerRegistry);
		const updatedRegistry = updatedRegistries[0];

		if (!isServerMode) {
			// save registry to local config:
			saveCliConfig({ currentRegistry: updatedRegistry });
		}

		// console.log(JSON.stringify(updatedRegistry.imagePullingSecret, null, 2));
		// log(`gcloud.createImagePullingSecret() :>>`, { updatedRegistry });

		return updatedRegistry.imagePullingSecret;
	} catch (e) {
		logError(`Cannot create image pull secret:`, e);
		return;
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

export default { authenticate, connectDockerRegistry, createImagePullingSecret, showHelp };
