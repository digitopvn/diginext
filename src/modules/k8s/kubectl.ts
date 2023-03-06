import { logError } from "diginext-utils/dist/console/log";
import execa from "execa";
import { isEmpty } from "lodash";

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
}

/**
 * Get all namepsaces of a cluster
 */
export async function getAllNamespaces(options: KubeCommandOptions = {}) {
	const { context } = options;
	const stdout = await execCmd(`kubectl ${context ? `--context=${context} ` : ""}get namespace -o json`, `Can't get namespace list.`);
	try {
		return JSON.parse(stdout).items as KubeNamespace[];
	} catch (e) {
		logError(`Can't get namespace list.`);
		return [];
	}
}

/**
 * Delete a namespace of a cluster
 */
export async function deleteNamespace(namespace: string, options: KubeCommandOptions = {}) {
	const { context } = options;
	try {
		await execCmd(`kubectl ${context ? `--context=${context} ` : ""}delete namespace ${namespace}`);
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
	const { context } = options;
	try {
		const stdout = await execCmd(`kubectl ${context ? `--context=${context} ` : ""}get secret -n ${namespace} -o json`);
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
	const { context } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "secret", name);

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
	const { context } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "get", "deploy", name, "-o", "json");

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
	const { context } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "deploy", name);

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout);
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return;
	}
}

/**
 * Get all deployments of a namespace
 * @param namespace @default "default"
 * @param labelFilter Filter by labels @default "" @example "phase!=prerelease,app=abc-xyz"
 */
export async function getAllDeploys(namespace = "default", labelFilter = "", options: KubeCommandOptions = {}) {
	const { context } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "deploy");

		if (!isEmpty(labelFilter)) args.push("-l", labelFilter);

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
	const { context } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "svc", name, "-o", "json");

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
	const { context } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "pod", name, "-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout);
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return;
	}
}

/**
 * Get pods in a namespace
 * @param namespace @default "default"
 * @param labelFilter Filter by labels @example "phase!=prerelease,app=abc-xyz"
 */
export async function getAllPods(namespace = "default", labelFilter = "", options: KubeCommandOptions = {}) {
	const { context } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "pod");

		if (!isEmpty(labelFilter)) args.push("-l", labelFilter);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items;
	} catch (e) {
		logError(`[KUBE_CTL]`, e);
		return [];
	}
}

export async function getIngress(name, namespace = "default") {
	// const authRes = await auth(options);
	// if (authRes.error) return authRes;

	try {
		const args = ["-n", namespace, "get", "ing", name, "-o", "json"];
		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout);
	} catch (e) {
		return { error: e.message };
	}
}
