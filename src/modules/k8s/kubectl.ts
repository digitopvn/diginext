import { logError, logSuccess } from "diginext-utils/dist/console/log";
import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import execa from "execa";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { isEmpty } from "lodash";
import path from "path";

import { CLI_DIR } from "@/config/const";
import type { ICluster } from "@/entities";
import type { KubeDeployment, KubeIngress, KubeNamespace, KubeSecret, KubeService } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import type { KubeIngressClass } from "@/interfaces/KubeIngressClass";
import type { KubePod } from "@/interfaces/KubePod";
import { execCmd } from "@/plugins";

import { DB } from "../api/DB";
import ClusterManager from ".";

interface KubeGenericOptions {
	/**
	 * A context name in KUBECONFIG
	 */
	context?: string;
	/**
	 * Should skip when error?
	 */
	skipOnError?: boolean;
}

interface KubeCommandOptions extends KubeGenericOptions {
	/**
	 * Filter resources by label
	 * @example "phase!=prerelease,app=abc-xyz"
	 */
	filterLabel?: string;
}

/**
 * Similar to `kubectl apply -f deployment.yaml`
 * @param filePath - Path to Kubernetes YAML file or URL of Kubernetes YAML file
 * @param namespace - Target namespace of the cluster
 * @param options - kubectl command options
 * @returns
 */
export async function kubectlApply(filePath: string, options: KubeGenericOptions = {}) {
	const { context } = options;
	const stdout = await execCmd(
		`kubectl ${context ? `--context=${context} ` : ""}apply -f ${filePath}`,
		`[KUBE_CTL] kubectlApply > Failed to apply "${filePath}" of "${context}" cluster.`
	);
	if (stdout) logSuccess(stdout);
	return stdout;
}

export async function kubectlApplyContent(yamlContent: string, namespace: string = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;

	if (!yamlContent) {
		logError(`[KUBE_CTL] kubectlApplyContent > YAML content is empty.`);
		return;
	}

	// create temporary YAML file
	const tmpDir = path.resolve(CLI_DIR, `storage/kubectl_tmp`);
	if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

	const filePath = path.resolve(tmpDir, `ingress.${makeDaySlug({ divider: "" })}.yaml`);
	if (existsSync(filePath)) unlinkSync(filePath);
	writeFileSync(filePath, yamlContent, "utf8");

	// process kubectl apply command which point to that temporary YAML file:
	const stdout = await execCmd(
		`kubectl ${context ? `--context=${context} --namespace=${namespace} ` : ""}apply -f ${filePath} ${filterLabel ? `-l ${filterLabel} ` : ""}`,
		`[KUBE_CTL] Failed to apply "${filePath}" in "${namespace}" namespace of "${context}" cluster context.`
	);
	if (stdout) logSuccess(stdout);
	return stdout;
}

/**
 * Get all namepsaces of a cluster
 */
export async function getAllNamespaces(options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	const stdout = await execCmd(
		`kubectl ${context ? `--context=${context} ` : ""}get namespace ${filterLabel ? `-l ${filterLabel} ` : ""}-o json`,
		`Can't get namespace list.`
	);
	try {
		return JSON.parse(stdout).items as KubeNamespace[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllNamespaces > Can't get namespace list.`);
		return [];
	}
}

/**
 * Create new namespace of a cluster
 */
export async function createNamespace(namespace: string, options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		await execCmd(`kubectl ${context ? `--context=${context} ` : ""}create namespace ${namespace}`);
		return { name: namespace };
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] createNamespace >`, e);
		return;
	}
}

/**
 * Delete a namespace of a cluster
 */
export async function deleteNamespace(namespace: string, options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		await execCmd(`kubectl ${context ? `--context=${context} ` : ""}delete namespace ${namespace} ${filterLabel ? `-l ${filterLabel} ` : ""}`);
		return { namespace };
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteNamespace >`, e);
		return;
	}
}

/**
 * Delete a namespace of a cluster
 */
export async function deleteNamespaceByCluster(namespace: string, clusterShortName: string) {
	const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
	if (!cluster) {
		logError(`[KUBECTL] Can't delete namespace "${namespace}" due to cluster "${clusterShortName}" not found.`);
		return;
	}
	const { name: context } = await ClusterManager.getKubeContextByCluster(cluster);

	try {
		await execCmd(`kubectl ${context ? `--context=${context} ` : ""}delete namespace ${namespace}`);
		return { namespace };
	} catch (e) {
		logError(`[KUBE_CTL] deleteNamespaceByCluster >`, e);
		return;
	}
}

/**
 * Check whether this namespace was existed
 */
export async function isNamespaceExisted(namespace: string, options: KubeCommandOptions = {}) {
	const allNamespaces = await getAllNamespaces(options);
	if (isEmpty(allNamespaces)) return false;
	return typeof allNamespaces.find((ns) => ns.metadata.name === namespace) !== "undefined";
}

/**
 * Get all secrets of a namespace
 */
export async function getAllSecrets(namespace: string = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const stdout = await execCmd(
			`kubectl ${context ? `--context=${context} ` : ""}get secret -n ${namespace} ${filterLabel ? `-l ${filterLabel} ` : ""}-o json`
		);
		return JSON.parse(stdout).items as KubeSecret[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllSecrets >`, e);
		return [];
	}
}

/**
 * Check whether this secret was existed in the namespace
 */
export async function isSecretExisted(name: string, namespace: string = "default", options: KubeCommandOptions = {}) {
	const allSecrets = await getAllSecrets(namespace, options);
	if (isEmpty(allSecrets)) return false;
	return typeof allSecrets.find((ns) => ns.metadata.name === name) !== "undefined";
}

/**
 * Delete a secret in a namespace
 */
export async function deleteSecret(name, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "secret", name);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteSecret >`, e);
		return;
	}
}

/**
 * Delete secrets in a namespace by filter
 */
export async function deleteSecretsByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "secret");

		if (filterLabel) args.push(`-l`, filterLabel);

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout);
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteSecretsByFilter >`, e);
		return;
	}
}

export async function getAllIngresses(options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("get", "ing", "-A");

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout).items as KubeIngress[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllIngresses >`, e);
		return;
	}
}

export async function getIngressClasses(options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("get", "ingressclass");

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout).items as KubeIngressClass[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getIngressClasses >`, e);
		return;
	}
}

export async function getIngress(name, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "get", "ing", name);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout);
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getIngress >`, e);
		return;
	}
}

export async function deleteIngress(name, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "ing", name);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteIngress >`, e);
		return;
	}
}

export async function deleteIngressByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "ing");

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteIngressByFilter >`, e);
		return;
	}
}

/**
 * Get a deployment in a namespace
 */
export async function getDeploy(name: string, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "get", "deploy", name);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout) as KubeDeployment;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getDeploy >`, e);
		return;
	}
}

/**
 * Get deployments in a namespace by filter labels
 */
export async function getDeploysByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "get", "deploy");

		if (filterLabel) args.push(`-l`, filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout) as KubeDeployment[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getDeploy >`, e);
		return;
	}
}

/**
 * Set image to a container of a deployment in a namespace
 */
export async function setDeployImage(name: string, container: string, imageURL: string, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "set", "image", `deployment/${name}`, `${container}=${imageURL}`);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] setDeployImage >`, e);
		return;
	}
}

/**
 * Set image to all containers of a deployment in a namespace
 * @param name - Deployment's name
 */
export async function setDeployImageAll(name: string, imageURL: string, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "set", "image", `deployment/${name}`, `*=${imageURL}`);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] setDeployImageAll >`, e);
		return;
	}
}

/**
 * Set port to all containers of a deployment in a namespace
 * @param name - Deployment's name
 * @param port - New port
 */
export async function setDeployPortAll(name: string, port: string, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		// get all container names
		const deployment = await getDeploy(name, namespace, options);

		const containers = deployment.spec.template.spec.containers;
		let res: string = "";

		for (let i = 0; i < containers.length; i++) {
			const args = [];
			if (context) args.push(`--context=${context}`);
			args.push(
				"-n",
				namespace,
				"patch",
				"deployment",
				name,
				"--type",
				"json",
				`--patch`,
				`[{"op": "replace", "path": "/spec/template/spec/containers/${i}/ports/0/containerPort", "value": ${port}}]`
			);

			const { stdout } = await execa("kubectl", args);
			res += stdout + "\n";
		}

		return res;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] setDeployPortAll >`, e);
		return;
	}
}

/**
 * Set "imagePullSecrets" name to deployments in a namespace by filter
 */
export async function setDeployImagePullSecretByFilter(imagePullSecretName: string, namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		// kubectl patch deployment valid-deployment  --type json   -p='[{"op": "replace", "path": "/spec/containers/0/image", "value":"new image"}]'
		args.push("-n", namespace, "patch", "deployment");

		if (filterLabel) args.push(`-l`, filterLabel);

		args.push(
			"--type",
			"json",
			`--patch`,
			`'[{"op": "replace", "path": "/spec/containers/0/imagePullSecrets/0/name", "value":"${imagePullSecretName}"}]'`
		);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] setDeployImagePullSecretByFilter >`, e);
		return;
	}
}

/**
 * Delete a deployment in a namespace
 */
export async function deleteDeploy(name, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "deploy", name);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteDeploy`, e);
		return;
	}
}

/**
 * Delete a deployments in a namespace by label filter
 */
export async function deleteDeploymentsByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "deploy");

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteDeploymentsByFilter >`, e);
		return;
	}
}

/**
 * Get all deployments of a namespace
 * @param namespace @default "default"
 */
export async function getDeploys(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "deploy");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items as KubeDeployment[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getDeploys >`, e);
		return [];
	}
}

/**
 * Get all deployments of a cluster
 */
export async function getAllDeploys(options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("get", "deploy", "-A");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items as KubeDeployment[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllDeploys >`, e);
		return [];
	}
}

/**
 * Get service by name
 * @param namespace @default "default"
 */
export async function getService(name, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "svc", name);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout) as KubeService;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getService >`, e);
		return;
	}
}

/**
 * Get services in a namespace
 * @param namespace @default "default"
 * @param labelFilter Filter by labels @example "phase!=prerelease,app=abc-xyz"
 */
export async function getAllServices(namespace = "default", labelFilter = "", options: KubeCommandOptions = {}) {
	const { context, skipOnError } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "svc");

		if (labelFilter) args.push("-l", labelFilter);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items as KubeService[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllServices >`, e);
		return [];
	}
}

/**
 * Delete service by name
 * @param namespace @default "default"
 */
export async function deleteService(name, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "delete", "svc", name);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteService >`, e);
		return;
	}
}

/**
 * Delete service by label filter
 * @param namespace @default "default"
 */
export async function deleteServiceByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "delete", "svc");

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteServiceByFilter >`, e);
		return;
	}
}

export async function getPod(name, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "pod", name);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout) as KubePod;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getPod >`, e);
		return;
	}
}

/**
 * Get pods in a namespace
 * @param namespace @default "default"
 */
export async function getAllPods(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "pod");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items as KubePod[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllPods >`, e);
		return [];
	}
}

export const getPodsByFilter = getAllPods;

export async function logPod(name, namespace = "default", options: KubeGenericOptions & { timestamps?: boolean; prefix?: boolean } = {}) {
	const { context, skipOnError, timestamps, prefix } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "logs", name);

		// options
		if (timestamps) args.push("--timestamps");
		if (prefix) args.push("--prefix");

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] logPod >`, e);
		return;
	}
}

export async function logPodByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, skipOnError, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "logs");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("--timestamps", "--prefix");

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] logPod >`, e);
		return;
	}
}

export async function setEnvVar(envVars: KubeEnvironmentVariable[], deploy: string, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;

	if (isEmpty(envVars)) {
		logError(`[KUBE_CTL] setEnvVar > No env variables to be set.`);
		return;
	}

	let envVarStrArr = envVars.map(({ name, value }) => `${name}=${value}`);

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "set", "env", `deployment/${deploy}`);

		args.push(...envVarStrArr);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] setEnvVar >`, e);
		return;
	}
}

export async function setEnvVarByFilter(envVars: KubeEnvironmentVariable[], namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;

	if (isEmpty(envVars)) {
		if (!skipOnError) logError(`[KUBE_CTL] setEnvVar > No env variables to be set.`);
		return;
	}

	let envVarStrArr = envVars.map(({ name, value }) => `${name}=${value || ""}`);

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "set", "env", `deployment`);

		args.push(...envVarStrArr);

		if (filterLabel) {
			args.push("-l", filterLabel);
		} else {
			args.push("--all");
		}

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] setEnvVar >`, e);
		return;
	}
}

export async function deleteEnvVar(envVarNames: string[], deploy: string, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;

	if (isEmpty(envVarNames)) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteEnvVar > No env variable names to be delete.`);
		return;
	}

	let envVarStrArr = envVarNames.map((name) => `${name}-`);

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "set", "env", `deployment/${deploy}`);

		args.push(...envVarStrArr);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteEnvVar >`, e);
		return;
	}
}

export async function deleteEnvVarByFilter(envVarNames: string[], namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;

	if (isEmpty(envVarNames)) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteEnvVar > No env variable names to be delete.`);
		return;
	}

	let envVarStrArr = envVarNames.map((name) => `${name}-`);

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "set", "env", `deployment`);

		args.push(...envVarStrArr);

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteEnvVar >`, e);
		return;
	}
}

export async function rollbackDeploy(name: string, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "rollout", "undo", `deployment/${name}`);

		const { stdout } = await execa("kubectl", args);
		return stdout as string;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllPods >`, e);
		return [];
	}
}

export async function rollbackDeployRevision(name: string, revision: number, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "rollout", "undo", `deployment/${name}`, `--revision=${revision}`);

		const { stdout } = await execa("kubectl", args);
		return stdout as string;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllPods >`, e);
		return [];
	}
}
