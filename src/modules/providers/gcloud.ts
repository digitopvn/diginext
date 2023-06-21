import chalk from "chalk";
import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import fs, { readFileSync } from "fs";
import inquirer from "inquirer";
import { isEmpty } from "lodash";
import yargs from "yargs";

import { Config, isServerMode } from "@/app.config";
import { saveCliConfig } from "@/config/config";
import type { ICloudProvider, ICluster, IContainerRegistry } from "@/entities";
import type { GoogleServiceAccount } from "@/interfaces/GoogleServiceAccount";
import type { InputOptions } from "@/interfaces/InputOptions";
import { createTmpFile, execCmd, isWin } from "@/plugins";

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
	const gcloud = await DB.findOne<ICloudProvider>("provider", { shortName: "gcloud" });

	// not support multiple cloud providers yet!
	if (!gcloud) {
		const newProvider = DB.create<ICloudProvider>("provider", {
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
export const connectDockerToRegistry = async (options?: InputOptions) => {
	const { execa, execaCommand, execaSync } = await import("execa");

	const { host, filePath, userId, workspaceId, registry: registrySlug } = options;

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
		if (Config.BUILDER === "docker") {
			// connect DOCKER to CONTAINER REGISTRY
			if (host) {
				connectRes = await execaCommand(`gcloud auth configure-docker ${host} --quiet`);
			} else {
				connectRes = await execaCommand(`gcloud auth configure-docker --quiet`);
			}
		} else {
			// connect PODMAN to CONTAINER REGISTRY
			connectRes = await execaCommand(`gcloud auth print-access-token | podman login -u oauth2accesstoken --password-stdin ${host || ""}`, {
				shell: "bash",
			});
		}
		if (options.isDebugging) log(`[GCLOUD] connectDockerRegistry >`, { authRes: connectRes });
	} catch (e) {
		logError(`[GCLOUD]`, e);
		return;
	}

	const existingRegistry = await DB.findOne<IContainerRegistry>("registry", { slug: registrySlug });
	if (options.isDebugging) log(`[GCLOUD] connectDockerRegistry >`, { existingRegistry });
	if (existingRegistry) return existingRegistry;

	// IF NOT EXISTED -> Save this container registry to database!
	const registryHost = host || "asia.gcr.io";
	const imageBaseURL = `${registryHost}/${serviceAccountObject.project_id}`;
	const newRegistry = await DB.create<IContainerRegistry>("registry", {
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
	const { execa, execaCommand, execaSync } = await import("execa");

	const { registrySlug, namespace = "default", clusterShortName } = options;
	// log(`providerShortName :>>`, providerShortName);

	if (!clusterShortName) {
		logError(`Cluster's short name is required.`);
		return;
	}

	// get Container Registry data:
	const registry = await DB.findOne<IContainerRegistry>("registry", { slug: registrySlug });

	if (!registry) {
		logError(`Container Registry (${registrySlug}) not found. Please contact your admin or create a new one.`);
		return;
	}

	// Get SERVICE ACCOUNT from CONTAINER REGISTRY -> to authenticate & generate "imagePullSecrets"
	const { host, serviceAccount } = registry;

	// Get "context" by "cluster" -> to create "imagePullSecrets" of "registry" in cluster's namespace
	const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
	if (!cluster) {
		logError(`Can't create "imagePullSecrets" in "${namespace}" namespace of "${clusterShortName}" cluster.`);
		return;
	}

	const { name: context } = await getKubeContextByCluster(cluster);

	// write down the service account file:
	const serviceAccountPath = createTmpFile(`gcloud-service-account.json`, serviceAccount);

	let secretValue: string;
	const secretName = `${registrySlug}-docker-registry-key`;

	// check if namespace is existed
	const isNsExisted = await ClusterManager.isNamespaceExisted(namespace, { context });
	if (!isNsExisted) {
		// create new namespace?
		const ns = await ClusterManager.createNamespace(namespace, { context });
		// still can't create namespace -> throw error!
		if (!ns) throw new Error(`Namespace "${namespace}" is not existed on this cluster ("${clusterShortName}").`);
	}

	// check if the secret is existed within the namespace, try to delete it!
	const isSecretExisted = await ClusterManager.isSecretExisted(secretName, namespace, { context });
	if (isSecretExisted) await ClusterManager.deleteSecret(secretName, namespace, { context });

	// Create new "imagePullSecret":
	const svcAccContentCmd = isWin() ? `$(type ${serviceAccountPath})` : `$(cat ${serviceAccountPath})`;
	const { stdout: newImagePullingSecret } = await execaCommand(
		`kubectl ${
			context ? `--context=${context} ` : ""
		}-n ${namespace} create secret docker-registry ${secretName} --docker-server=${host} --docker-username=_json_key --docker-password="${svcAccContentCmd}" -o json`,
		isWin() ? {} : { shell: "bash" }
	);

	// delete temporary file
	// unlink(serviceAccountPath, (err) => err && logError(`[REGISTRY CONTROLLER] Remove tmp file:`, err));

	// console.log("GCLOUD > createImagePullingSecret > newImagePullingSecret :>> ", newImagePullingSecret);

	// create new image pulling secret (in namespace & in database)
	try {
		secretValue = JSON.parse(newImagePullingSecret).data[".dockerconfigjson"];
		// log({ secretValue });

		// save this secret to database:
		let updateData = {
			imagePullSecret: {
				name: secretName,
				value: secretValue,
			},
		};

		const updatedRegistries = await DB.update<IContainerRegistry>("registry", { slug: registrySlug }, updateData as IContainerRegistry);
		const updatedRegistry = updatedRegistries[0];

		if (!isServerMode) {
			// save registry to local config:
			saveCliConfig({ currentRegistry: updatedRegistry });
		}

		// console.log(JSON.stringify(updatedRegistry.imagePullSecret, null, 2));
		// log(`gcloud.createImagePullingSecret() :>>`, { updatedRegistry });
		logSuccess(
			`[GCLOUD] ✓ Successfully assign "imagePullSecret" data (${secretName}) to "${namespace}" namespace of "${clusterShortName}" cluster.`
		);

		return updatedRegistry.imagePullSecret;
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
				await connectDockerToRegistry(options);
			} catch (e) {
				logError(e);
			}
			break;

		case "create-image-pull-secret":
			const registries = await DB.find<IContainerRegistry>("registry", {});
			if (isEmpty(registries)) {
				logError(`This workspace doesn't have any registered Container Registries.`);
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

export default { authenticate, connectDockerRegistry: connectDockerToRegistry, createImagePullingSecret, showHelp };
