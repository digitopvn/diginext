import { logError, logSuccess } from "diginext-utils/dist/console/log";
import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import execa from "execa";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { isEmpty } from "lodash";
import path from "path";

import { CLI_DIR } from "@/config/const";
import type { Cluster } from "@/entities";
import type { KubeDeployment, KubeNamespace, KubeSecret, KubeService } from "@/interfaces";
import { execCmd } from "@/plugins";

import { DB } from "../api/DB";
import ClusterManager from ".";

interface KubeCommandOptions {
	/**
	 * A context name in KUBECONFIG
	 */
	context?: string;
	/**
	 * Filter resources by label
	 * @example "phase!=prerelease,app=abc-xyz"
	 */
	filterLabel?: string;
}

export async function kubectlApply(filePath: string, namespace: string = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	const stdout = await execCmd(
		`kubectl ${context ? `--context=${context} ` : ""}apply -f ${filePath} -n ${namespace} ${filterLabel ? `-l ${filterLabel} ` : ""}`,
		`[KUBE_CTL] Failed to apply "${filePath}" in "${namespace}" namespace of "${context}" cluster context.`
	);
	if (stdout) logSuccess(stdout);
	return stdout;
}

export async function kubectlApplyContent(yamlContent: string, namespace: string = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;

	if (isEmpty(yamlContent)) {
		logError(`[KUBE_CTL] Apply content > YAML content is empty.`);
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
		`kubectl ${context ? `--context=${context} ` : ""}apply -f ${filePath} -n ${namespace} ${filterLabel ? `-l ${filterLabel} ` : ""}`,
		`[KUBE_CTL] Failed to apply "${filePath}" in "${namespace}" namespace of "${context}" cluster context.`
	);
	if (stdout) logSuccess(stdout);
	return stdout;
}

/**
 * Get all namepsaces of a cluster
 */
export async function getAllNamespaces(options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	const stdout = await execCmd(
		`kubectl ${context ? `--context=${context} ` : ""}get namespace ${filterLabel ? `-l ${filterLabel} ` : ""}-o json`,
		`Can't get namespace list.`
	);
	try {
		return JSON.parse(stdout).items as KubeNamespace[];
	} catch (e) {
		logError(`Can't get namespace list.`);
		return [];
	}
}

/**
 * Create new namespace of a cluster
 */
export async function createNamespace(namespace: string, options: KubeCommandOptions = {}) {
	const { context } = options;
	try {
		await execCmd(`kubectl ${context ? `--context=${context} ` : ""}create namespace ${namespace}`);
		return { name: namespace };
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return;
	}
}

/**
 * Delete a namespace of a cluster
 */
export async function deleteNamespace(namespace: string, options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	try {
		await execCmd(`kubectl ${context ? `--context=${context} ` : ""}delete namespace ${namespace} ${filterLabel ? `-l ${filterLabel} ` : ""}`);
		return { namespace };
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return;
	}
}

/**
 * Delete a namespace of a cluster
 */
export async function deleteNamespaceByCluster(namespace: string, clusterShortName: string) {
	const cluster = await DB.findOne<Cluster>("cluster", { shortName: clusterShortName });
	if (!cluster) {
		logError(`[KUBECTL] Can't delete namespace "${namespace}" due to cluster "${clusterShortName}" not found.`);
		return;
	}
	const { name: context } = await ClusterManager.getKubeContextByCluster(cluster);

	try {
		await execCmd(`kubectl ${context ? `--context=${context} ` : ""}delete namespace ${namespace}`);
		return { namespace };
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
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
	const { context, filterLabel } = options;
	try {
		const stdout = await execCmd(
			`kubectl ${context ? `--context=${context} ` : ""}get secret -n ${namespace} ${filterLabel ? `-l ${filterLabel} ` : ""}-o json`
		);
		return JSON.parse(stdout).items as KubeSecret[];
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
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
export async function deleteSecret(name, namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "secret", name);

		if (filterLabel) args.push(`-l`, filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return;
	}
}

/**
 * Delete secrets in a namespace by filter
 */
export async function deleteSecretsByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "secret");

		if (filterLabel) args.push(`-l`, filterLabel);

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout);
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return;
	}
}

/**
 * Get a deployment in a namespace
 */
export async function getDeploy(name, namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "get", "deploy", name);

		if (filterLabel) args.push(`-l`, filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout) as KubeDeployment;
	} catch (e) {
		logError(e);
		return;
	}
}

/**
 * Delete a deployment in a namespace
 */
export async function deleteDeploy(name, namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "deploy", name);

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return;
	}
}

/**
 * Delete a deployments in a namespace by label filter
 */
export async function deleteDeploymentsByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "deploy");

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return;
	}
}

/**
 * Get all deployments of a namespace
 * @param namespace @default "default"
 */
export async function getAllDeploys(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "deploy");

		if (!isEmpty(filterLabel)) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items as KubeDeployment[];
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return [];
	}
}

/**
 * Get service by name
 * @param namespace @default "default"
 */
export async function getService(name, namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "svc", name);

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout) as KubeService;
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return;
	}
}

/**
 * Get services in a namespace
 * @param namespace @default "default"
 * @param labelFilter Filter by labels @example "phase!=prerelease,app=abc-xyz"
 */
export async function getAllServices(namespace = "default", labelFilter = "", options: KubeCommandOptions = {}) {
	const { context } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "svc");

		if (!isEmpty(labelFilter)) args.push("-l", labelFilter);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items as KubeService[];
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return [];
	}
}

export async function getPod(name, namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "pod", name);

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout);
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return;
	}
}

/**
 * Delete service by name
 * @param namespace @default "default"
 */
export async function deleteService(name, namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "delete", "svc", name);

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return;
	}
}

/**
 * Delete service by label filter
 * @param namespace @default "default"
 */
export async function deleteServiceByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "delete", "svc");

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return;
	}
}

/**
 * Get pods in a namespace
 * @param namespace @default "default"
 */
export async function getAllPods(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "pod");

		if (!isEmpty(filterLabel)) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items;
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return [];
	}
}

export async function getIngress(name, namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "get", "ing", name);

		if (!isEmpty(filterLabel)) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout);
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return;
	}
}

export async function deleteIngress(name, namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "ing", name);

		if (!isEmpty(filterLabel)) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		logError(`KUBE_CTL`, e);
		return;
	}
}

export async function deleteIngressByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "ing");

		if (!isEmpty(filterLabel)) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		logError(`KUBE_CTL`, e);
		return;
	}
}
