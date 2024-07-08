import { log, logSuccess } from "diginext-utils/dist/xconsole/log";
import type { ExecaReturnValue } from "execa";

import { Config, isServerMode } from "@/app.config";
import { saveCliConfig } from "@/config/config";
import type { IContainerRegistry, IUser, IWorkspace } from "@/entities";

import ClusterManager from "../k8s";
import { getKubeContextByCluster } from "../k8s/kube-config";
import type { ContainerRegistrySecretOptions, DockerRegistryCredentials } from "./ContainerRegistrySecretOptions";

interface DockerRegistryConnectOptions {
	workspaceId: string;
	/**
	 * Container registry slug
	 */
	registry?: string;
	/**
	 * @default false
	 */
	isDebugging?: boolean;
}

const DockerRegistry = {
	connectDockerToRegistry: async (creds: DockerRegistryCredentials, options: DockerRegistryConnectOptions) => {
		const { DB } = await import("@/modules/api/DB");

		const { execaCommand, execaSync } = await import("execa");

		const { workspaceId, registry: registrySlug } = options;

		const { server = "https://index.docker.io/v2/", username, password, email } = creds;

		if (!password) throw new Error(`Permissions denied.`);

		try {
			let connectRes: ExecaReturnValue<string>;
			if (Config.BUILDER === "docker") {
				// connect DOCKER ENGINE to DOCKER REGISTRY
				connectRes = await execaCommand(`docker login -u ${username} -p ${password}`);
				if (options.isDebugging) log(`[DOCKER] connectDockerRegistry >`, { connectRes });
			} else {
				// connect PODMAN to DOCKER REGISTRY
				connectRes = await execaCommand(`podman login docker.io -u ${username} -p ${password}`);
				if (options.isDebugging) log(`[PODMAN] connectDockerRegistry >`, { connectRes });
			}
		} catch (e) {
			// NOTE: DO NOT EXPOSE PASSWORD IN THIS LOG DUE TO SECURITY RISK !!!
			console.log(
				`[${Config.BUILDER.toUpperCase()}] connectDockerToRegistry() > error :>>`,
				(e.message || "unknown").replace(new RegExp(password, "gi"), "***")
			);
			if (!e.message.includes("The specified item already exists in the keychain"))
				throw new Error(`[${Config.BUILDER.toUpperCase()}] Unable to connect to Docker Registry (${registrySlug}): Authentication failure.`);
		}

		const workspace = await DB.findOne("workspace", { _id: workspaceId });
		if (!workspace) throw new Error(`[DOCKER] Workspace not found.`);

		const existingRegistry = await DB.findOne("registry", { slug: registrySlug });
		if (options.isDebugging) log(`[DOCKER] connectDockerRegistry >`, { existingRegistry });

		if (existingRegistry) return existingRegistry;

		// IF NOT EXISTED -> Save this container registry to database!
		const imageBaseURL = `${server}/${workspace.slug}`;
		const newRegistry = await DB.create("registry", {
			name: "Docker Registry",
			provider: "dockerhub",
			imageBaseURL,
			host: server,
			username,
			password,
			email,
			workspace: workspaceId,
		});
		if (options.isDebugging) log(`[DOCKER] Added new container registry: "${newRegistry.name}" (${newRegistry.slug}).`);

		return newRegistry;
	},
	createImagePullSecret: async (options: ContainerRegistrySecretOptions) => {
		const { DB } = await import("@/modules/api/DB");
		const { execa, execaCommand, execaSync } = await import("execa");

		const { registrySlug, namespace = "default", clusterSlug } = options;

		if (!clusterSlug) throw new Error(`Cluster's short name is required.`);

		// Get "context" by "cluster" -> to create "imagePullSecrets" of "registry" in cluster's namespace
		const cluster = await DB.findOne("cluster", { slug: clusterSlug }, { populate: ["owner", "workspace"] });
		if (!cluster) throw new Error(`Can't create "imagePullSecrets" in "${namespace}" namespace of "${clusterSlug}" cluster.`);

		// authenticate cluster & switch to that cluster's context
		try {
			const { owner, workspace } = cluster;
			await ClusterManager.authCluster(cluster, { ownership: { owner: owner as IUser, workspace: workspace as IWorkspace } });
		} catch (e) {
			throw new Error(e.message);
		}

		const { name: context } = await getKubeContextByCluster(cluster);

		// get Container Registry data:
		const registry = await DB.findOne("registry", { slug: registrySlug });

		if (!registry) {
			throw new Error(`Container Registry (${registrySlug}) not found. Please contact your admin or create a new one.`);
		}
		const {
			dockerServer: server = "https://index.docker.io/v2/",
			dockerUsername: username,
			dockerEmail: email,
			dockerPassword: password,
		} = registry;

		if (!password) throw new Error(`Permissions denied.`);

		const secretName = `${registry.slug}-docker-registry-key`;
		let secretValue: string;

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

		// Create new "imagePullSecret":

		// kubectl create secret docker-registry regcred --docker-server=<your-registry-server> --docker-username=<your-name> --docker-password=<your-pword> --docker-email=<your-email>
		const createSecretOptions = [`--docker-server=${server}`, `--docker-username=${username}`, `--docker-password=${password}`];
		if (email) createSecretOptions.push(`--docker-email=${email}`);
		if (context) createSecretOptions.push(`--context=${context}`);

		// create new image pulling secret (in namespace & in database)
		try {
			const { stdout: newImagePullingSecret } = await execa(`kubectl`, [
				"-n",
				namespace,
				`create`,
				`secret`,
				`docker-registry`,
				secretName,
				...createSecretOptions,
				"-o",
				"json",
			]);

			secretValue = JSON.parse(newImagePullingSecret).data[".dockerconfigjson"];
			// log({ secretValue });

			// save this secret to database:
			let updateData = {
				imagePullSecret: {
					name: secretName,
					value: secretValue,
				},
			} as IContainerRegistry;

			const updatedRegistries = await DB.update("registry", { slug: registrySlug }, updateData);
			const updatedRegistry = updatedRegistries[0];

			// save registry to local config:
			if (!isServerMode) saveCliConfig({ currentRegistry: updatedRegistry });

			logSuccess(
				`[DOCKER] ✓ Successfully assign "imagePullSecret" data (${secretName}) to "${namespace}" namespace of "${clusterSlug}" cluster.`
			);

			return updatedRegistry.imagePullSecret;
		} catch (e) {
			throw new Error(`[DOCKER] Cannot create image pull secret: ${e}`.replace(password, "***"));
		}
	},
};

export default DockerRegistry;
