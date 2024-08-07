import chalk from "chalk";
import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import fs, { createReadStream, readFileSync } from "fs";
import inquirer from "inquirer";
import { isEmpty } from "lodash";
import yargs from "yargs";

import { Config, isServerMode } from "@/app.config";
import { saveCliConfig } from "@/config/config";
import type { IContainerRegistry } from "@/entities";
import type { GoogleServiceAccount } from "@/interfaces/GoogleServiceAccount";
import type { InputOptions } from "@/interfaces/InputOptions";
import { createTmpFile, execCmd, isWin } from "@/plugins";

import { askForCluster } from "../cluster/ask-for-cluster";
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

		// if success
		return true;
	} catch (e) {
		// if failed
		logError(e);
		return false;
	}
};

/**
 * Connect Docker to Google Cloud Registry
 */
export const connectDockerToRegistry = async (options?: InputOptions & { builder?: "docker" | "podman" }) => {
	const { execa, execaCommand, execaSync } = await import("execa");
	const { DB } = await import("@/modules/api/DB");

	const { host = "https://asia-docker.pkg.dev", filePath, userId, workspaceId, registry: registrySlug, builder = Config.BUILDER } = options;

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
		if (builder === "docker") {
			// connect DOCKER to CONTAINER REGISTRY
			const subprocess = execa("docker", ["login", "-u", "_json_key", "--password-stdin", host]);
			createReadStream(filePath).pipe(subprocess.stdin);
			const { stdout } = await subprocess;
			connectRes = stdout;
			// if (host) {
			// 	connectRes = await execaCommand(`gcloud auth configure-docker ${host} --quiet`);
			// } else {
			// 	connectRes = await execaCommand(`gcloud auth configure-docker --quiet`);
			// }
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

	const existingRegistry = await DB.findOne("registry", { slug: registrySlug }, { ignorable: true });
	if (options.isDebugging) log(`[GCLOUD] connectDockerRegistry >`, { existingRegistry });
	if (existingRegistry) return existingRegistry;

	// IF NOT EXISTED -> Save this container registry to database!
	const registryHost = host || "asia.gcr.io";
	const imageBaseURL = `${registryHost}/${serviceAccountObject.project_id}`;
	const newRegistry = await DB.create("registry", {
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
	const { execaCommand } = await import("execa");
	const { DB } = await import("@/modules/api/DB");

	const { registrySlug, namespace = "default", clusterSlug } = options;
	// log(`providerShortName :>>`, providerShortName);

	if (!clusterSlug) {
		logError(`Cluster's short name is required.`);
		return;
	}

	// get Container Registry data:
	const registry = await DB.findOne("registry", { slug: registrySlug });

	if (!registry) {
		logError(`Container Registry (${registrySlug}) not found. Please contact your admin or create a new one.`);
		return;
	}

	// Get SERVICE ACCOUNT from CONTAINER REGISTRY -> to authenticate & generate "imagePullSecrets"
	const { host, serviceAccount } = registry;

	// Get "context" by "cluster" -> to create "imagePullSecrets" of "registry" in cluster's namespace
	const cluster = await DB.findOne("cluster", { slug: clusterSlug });
	if (!cluster) {
		logError(`Can't create "imagePullSecrets" in "${namespace}" namespace of "${clusterSlug}" cluster.`);
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
		if (!ns) throw new Error(`Namespace "${namespace}" is not existed on this cluster ("${clusterSlug}").`);
	}

	// check if the secret is existed within the namespace, try to delete it!
	const isSecretExisted = await ClusterManager.isSecretExisted(secretName, namespace, { context });
	if (isSecretExisted) await ClusterManager.deleteSecret(secretName, namespace, { context });

	try {
		const svcAccContentCmd = isWin() ? `$(type ${serviceAccountPath})` : `$(cat ${serviceAccountPath})`;
		// Create new "imagePullSecret":
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

		secretValue = JSON.parse(newImagePullingSecret).data[".dockerconfigjson"];
		// log({ secretValue });

		// save this secret to database:
		let updateData = {
			imagePullSecret: {
				name: secretName,
				value: secretValue,
			},
		};

		const updatedRegistries = await DB.update("registry", { slug: registrySlug }, updateData as IContainerRegistry);
		const updatedRegistry = updatedRegistries[0];

		if (!isServerMode) {
			// save registry to local config:
			saveCliConfig({ currentRegistry: updatedRegistry });
		}

		// console.log(JSON.stringify(updatedRegistry.imagePullSecret, null, 2));
		// log(`gcloud.createImagePullingSecret() :>>`, { updatedRegistry });
		logSuccess(`[GCLOUD] ✓ Successfully assign "imagePullSecret" data (${secretName}) to "${namespace}" namespace of "${clusterSlug}" cluster.`);

		return updatedRegistry.imagePullSecret;
	} catch (e) {
		logError(`Cannot create image pull secret: ${e}`);
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

export default { authenticate, connectDockerRegistry: connectDockerToRegistry, createImagePullingSecret, showHelp };
