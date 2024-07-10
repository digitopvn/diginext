import type { V1PersistentVolume, V1PersistentVolumeClaim, V1StorageClass } from "@kubernetes/client-node";
import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { logError, logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import { execa, execaCommandSync } from "execa";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { isEmpty, isUndefined, round, startsWith, toInteger } from "lodash";
import path from "path";

import { CLI_DIR } from "@/config/const";
import type { KubeDeployment, KubeIngress, KubeNamespace, KubeSecret, KubeService, KubeStatefulSet } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import type { KubeIngressClass } from "@/interfaces/KubeIngressClass";
import type { KubeNode } from "@/interfaces/KubeNode";
import type { KubePod } from "@/interfaces/KubePod";
import { execCmd } from "@/plugins";

import ClusterManager from "./index";

interface KubeGenericOptions {
	/**
	 * Output type (JSON or YAML)
	 * @default "json"
	 */
	output?: "json" | "yaml";
	/**
	 * A context name in KUBECONFIG
	 */
	context?: string;
	/**
	 * Should skip when error?
	 * @default false
	 */
	skipOnError?: boolean;
	/**
	 * Debug
	 */
	isDebugging?: boolean;
}

interface KubeCommandOptions extends KubeGenericOptions {
	/**
	 * Filter resources by label
	 * @example "phase!=prerelease,app=abc-xyz"
	 */
	filterLabel?: string;
}

/**
 * Convert filter object to filter labels string
 * - Use ! for different than value
 * @example { phase: "!prerelease", app: "abc-xyz" } -> "phase!=prerelease,app=abc-xyz"
 */
export function objectToFilterLabels(obj: Record<string, string>) {
	if (!obj) throw new Error(`Input object is required.`);
	return Object.entries(obj)
		.map(([key, val]) => {
			if (startsWith("!", val)) return `${key}!=${val.substring(1)}`;
			return `${key}=${val}`;
		})
		.join(",");
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

export async function kubectlApplyContent(yamlContent: string, options: KubeCommandOptions = {}) {
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
		`kubectl ${context ? `--context=${context} ` : ""}apply -f ${filePath} ${filterLabel ? `-l ${filterLabel} ` : ""}`,
		`[KUBE_CTL] Failed to apply "${filePath}" in of "${context}" cluster context.`
	);
	if (stdout) logSuccess(stdout);
	return stdout;
}

export interface NodeUsage {
	name: string;
	cpu: string;
	cpuPercent: string;
	cpuCapacity: string;
	memory: string;
	memoryPercent: string;
	memoryCapacity: string;
}

/**
 * Get all nodes of a cluster
 */
export async function getAllNodes(options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("get", "node");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		// get metrics
		let usage: NodeUsage[];
		try {
			// get resource usage
			const { stdout: usageStr } = execaCommandSync(`kubectl --context=${context} top node --no-headers=true`);
			usage = usageStr.split("\n").map((line) => {
				const [name, cpu, cpuPercent, memory, memoryPercent] = line.trim().split(/\s+/);
				const memoryCapacity = Math.round((toInteger(memory.replace(/Mi/, "")) / toInteger(memoryPercent.replace("%", ""))) * 100) + "Mi";
				const cpuCapacity = Math.round((toInteger(cpu.replace(/m/, "")) / toInteger(cpuPercent.replace("%", ""))) * 100) + "m";
				return {
					name,
					cpu,
					cpuPercent,
					cpuCapacity,
					memory,
					memoryPercent,
					memoryCapacity,
				};
			});
		} catch (e2) {
			logWarn(`[KUBE_CTL] getAllNodes > ${context} > Unable to get metrics :>> ${e2}`);
			usage = [];
		}

		const { stdout } = await execa("kubectl", args);
		const nodes = (JSON.parse(stdout).items as KubeNode[]).map((node) => {
			// get pod count
			try {
				const { stdout: podRes } = execaCommandSync(
					`kubectl --context=${context} get pods --field-selector spec.nodeName=${node.metadata.name} -A -o json`
				);
				const pods = JSON.parse(podRes).items;
				node.podCount = pods.length;
			} catch (e) {
				node.podCount = 0;
			}
			// usage
			const nodeUsage = usage.find((n) => n.name === node.metadata.name);
			node.cpu = nodeUsage?.cpu || "0";
			node.cpuPercent = nodeUsage?.cpuPercent || "0";
			node.cpuCapacity = nodeUsage?.cpuCapacity || "0";
			node.memory = nodeUsage?.memory || "0";
			node.memoryPercent = nodeUsage?.memoryPercent || "0";
			node.memoryCapacity = nodeUsage?.memoryCapacity || "0";

			return node;
		});
		return nodes;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllNodes > ${context} > Unable to get the list:`, e);
		return [];
	}
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
		if (!skipOnError) logError(`[KUBE_CTL] getAllNamespaces > ${context} > Can't get namespace list.`);
		return [];
	}
}

/**
 * Get a namepsace of a cluster
 */
export async function getNamespace(name: string, options: KubeCommandOptions = {}) {
	const { context, skipOnError, output = "json" } = options;
	const stdout = await execCmd(`kubectl ${context ? `--context=${context} ` : ""}get namespace ${name} -o ${output}`, `Can't get a namespace.`);
	try {
		return !options?.output || options?.output === "json" ? (JSON.parse(stdout).items as KubeNamespace) : stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllNamespaces > ${context} > Can't get namespace list.`);
		return;
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
		if (!skipOnError) logError(`[KUBE_CTL] createNamespace > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] deleteNamespace > ${context} >`, e);
		return;
	}
}

/**
 * Delete a namespace of a cluster
 */
export async function deleteNamespaceByCluster(namespace: string, clusterSlug: string) {
	const { DB } = await import("@/modules/api/DB");
	const cluster = await DB.findOne("cluster", { slug: clusterSlug });
	if (!cluster) {
		logError(`[KUBECTL] Can't delete namespace "${namespace}" due to cluster "${clusterSlug}" not found.`);
		return;
	}
	const { name: context } = await ClusterManager.getKubeContextByCluster(cluster);

	try {
		await execCmd(`kubectl ${context ? `--context=${context} ` : ""}delete namespace ${namespace}`);
		return { namespace };
	} catch (e) {
		logError(`[KUBE_CTL] deleteNamespaceByCluster > ${context} >`, e);
		return;
	}
}

/**
 * Check whether this namespace was existed
 */
export async function isNamespaceExisted(namespace: string, options: KubeCommandOptions = {}) {
	const allNamespaces = await getAllNamespaces(options);
	if (isUndefined(allNamespaces)) return;
	if (isEmpty(allNamespaces)) return false;
	return typeof allNamespaces.find((ns) => ns.metadata.name === namespace) !== "undefined";
}

/**
 * Get all secrets of a namespace
 */
export async function getSecrets(namespace: string = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const stdout = await execCmd(
			`kubectl ${context ? `--context=${context} ` : ""}get secret -n ${namespace} ${filterLabel ? `-l ${filterLabel} ` : ""}-o json`
		);
		return JSON.parse(stdout).items as KubeSecret[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getSecrets > ${context} >`, e);
		return [];
	}
}

/**
 * Get all secrets of a cluster
 */
export async function getAllSecrets(options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const stdout = await execCmd(
			`kubectl ${context ? `--context=${context} ` : ""}get secret ${filterLabel ? `-l ${filterLabel} ` : ""}-A -o json`
		);
		return JSON.parse(stdout).items as KubeSecret[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllSecrets > ${context} >`, e);
		return [];
	}
}

/**
 * Check whether this secret was existed in the namespace
 */
export async function isSecretExisted(name: string, namespace: string = "default", options: KubeCommandOptions = {}) {
	const allSecrets = await getSecrets(namespace, options);
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
		if (!skipOnError) logError(`[KUBE_CTL] deleteSecret > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] deleteSecretsByFilter > ${context} >`, e);
		return;
	}
}

/**
 * Get all ingresses of a cluster
 */
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
		if (!skipOnError) logError(`[KUBE_CTL] getAllIngresses > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] getIngressClasses > ${context} >`, e);
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
		return JSON.parse(stdout) as KubeIngress;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getIngress > ${context} >`, e);
		return;
	}
}

/**
 * Get ingress list of a namespace
 * @param namespace
 */
export async function getIngresses(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, skipOnError, filterLabel } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "ing");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout).items as KubeIngress[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getIngress > ${context} >`, e);
		return [];
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
		if (!skipOnError) logError(`[KUBE_CTL] deleteIngress > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] deleteIngressByFilter > ${context} >`, e);
		return;
	}
}

export interface GetKubeDeployOptions extends KubeCommandOptions {
	/**
	 * If `TRUE`, it will get metrics of pods and include in the response.
	 *
	 * @default true
	 */
	metrics?: boolean;
}

/**
 * Get all deployments of a namespace
 * @param namespace @default "default"
 */
export async function getDeploys(namespace = "default", options: GetKubeDeployOptions = {}) {
	const { context, filterLabel, skipOnError, metrics = true } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "deploy");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		const deploys = items as KubeDeployment[];

		if (!metrics) return deploys;

		// get pods usage
		const usageStr = execaCommandSync(`kubectl --context=${context} -n ${namespace} top pod --no-headers=true`).stdout;
		const podUsages = usageStr.split("\n").map((line) => {
			const [name, cpu = "0m", memory = "0Mi"] = line.trim().split(/\s+/);
			const cpuInt = toInteger(cpu.replace("m", "")) ?? 0;
			const memInt = toInteger(memory.replace("Mi", "")) ?? 0;
			return { namespace, name, cpu, memory, cpuInt, memInt };
		});

		return deploys.map((deploy) => {
			// resource usage average
			const cpuAvg =
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).reduce((total, obj) => total + obj.cpuInt, 0) /
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).length;

			deploy.cpuAvg = `${round(cpuAvg)}m`;

			const memAvg =
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).reduce((total, obj) => total + obj.memInt, 0) /
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).length;

			deploy.memoryAvg = `${round(memAvg)}Mi`;

			if (deploy.cpuAvg === "NaNm") deploy.cpuAvg = "";
			if (deploy.memoryAvg === "NaNMi") deploy.memoryAvg = "";

			// resource usage recommend
			deploy.cpuRecommend = (deploy.cpuAvg ? toInteger(deploy.cpuAvg.replace("m", "")) : 0) * 1.5 + "m";
			deploy.memoryRecommend = (deploy.memoryAvg ? toInteger(deploy.memoryAvg.replace("Mi", "")) : 0) * 1.5 + "Mi";

			// resource usage capacity
			deploy.cpuCapacity =
				deploy.spec.template.spec.containers.find((cont) => typeof cont.resources?.limits?.cpu !== "undefined")?.resources?.limits?.cpu || "";

			deploy.memoryCapacity =
				deploy.spec.template.spec.containers.find((cont) => typeof cont.resources?.limits?.memory !== "undefined")?.resources?.limits
					?.memory || "";

			return deploy;
		});
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getDeploys > ${context} >`, e);
		return [];
	}
}

/**
 * Get all deployments of a cluster
 */
export async function getAllDeploys(options: GetKubeDeployOptions = {}) {
	const { context, filterLabel, skipOnError, metrics = true } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("get", "deploy", "-A");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);

		// get pods usage
		const usageStr = metrics ? execaCommandSync(`kubectl --context=${context} top pod --no-headers=true -A`).stdout : "";
		const podUsages = metrics
			? usageStr.split("\n").map((line) => {
					const [ns, name, cpu = "0m", memory = "0Mi"] = line.trim().split(/\s+/);
					const cpuInt = toInteger(cpu.replace("m", "")) ?? 0;
					const memInt = toInteger(memory.replace("Mi", "")) ?? 0;
					return { namespace: ns, name, cpu, memory, cpuInt, memInt };
			  })
			: [];

		return (items as KubeDeployment[]).map((deploy) => {
			// resource usage average
			const cpuAvg =
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).reduce((total, obj) => total + obj.cpuInt, 0) /
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).length;

			deploy.cpuAvg = `${round(cpuAvg)}m`;

			const memAvg =
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).reduce((total, obj) => total + obj.memInt, 0) /
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).length;

			deploy.memoryAvg = `${round(memAvg)}Mi`;

			if (deploy.cpuAvg === "NaNm") deploy.cpuAvg = "";
			if (deploy.memoryAvg === "NaNMi") deploy.memoryAvg = "";

			// resource usage recommend
			deploy.cpuRecommend = (deploy.cpuAvg ? toInteger(deploy.cpuAvg.replace("m", "")) : 0) * 1.5 + "m";
			deploy.memoryRecommend = (deploy.memoryAvg ? toInteger(deploy.memoryAvg.replace("Mi", "")) : 0) * 1.5 + "Mi";

			// resource usage capacity
			deploy.cpuCapacity =
				deploy.spec.template.spec.containers.find((cont) => typeof cont.resources?.limits?.cpu !== "undefined")?.resources?.limits?.cpu || "";

			deploy.memoryCapacity =
				deploy.spec.template.spec.containers.find((cont) => typeof cont.resources?.limits?.memory !== "undefined")?.resources?.limits
					?.memory || "";

			return deploy;
		});
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllDeploys > ${context} >`, e);
		return [];
	}
}

/**
 * Get a deployment in a namespace
 */
export async function getDeploy(name: string, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError, output = "json" } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "get", "deploy", name);

		if (output === "json") args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return output === "json" ? (JSON.parse(stdout) as KubeDeployment) : stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getDeploy > ${context} >`, e);
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
		return JSON.parse(stdout).items as KubeDeployment[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getDeploy > ${context} >`, e);
		return;
	}
}

/**
 * Scale replicas of a deployment in a namespace
 */
export async function scaleDeploy(name: string, replicas: number, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "scale", "deployment", name, `--replicas=${replicas}`);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] scaleDeploy > ${context} >`, e);
		return;
	}
}

/**
 * Scale replicas of multiple deployments in a namespace by label filter
 * @param name - Deployment's name
 */
export async function scaleDeployByFilter(replicas: number, namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "scale", "deployment", `--replicas=${replicas}`);

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] scaleDeployByFilter > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] setDeployImage > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] setDeployImageAll > ${context} >`, e);
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
		const deployment = (await getDeploy(name, namespace, options)) as KubeDeployment;

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
		if (!skipOnError) logError(`[KUBE_CTL] setDeployPortAll > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] setDeployImagePullSecretByFilter > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] deleteDeploy > ${context} :>>`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] deleteDeploymentsByFilter > ${context} >`, e);
		return;
	}
}

/**
 * Get all StatefulSets of a namespace
 * @param namespace @default "default"
 */
export async function getStatefulSets(namespace = "default", options: GetKubeDeployOptions = {}) {
	const { context, filterLabel, skipOnError, metrics = true } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "statefulset");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		const deploys = items as KubeStatefulSet[];

		// get pods usage
		const usageStr = metrics ? execaCommandSync(`kubectl --context=${context} -n ${namespace} top pod --no-headers=true`).stdout : "";
		const podUsages = metrics
			? usageStr.split("\n").map((line) => {
					const [ns, name, cpu = "0m", memory = "0Mi"] = line.trim().split(/\s+/);
					const cpuInt = toInteger(cpu.replace("m", "")) ?? 0;
					const memInt = toInteger(memory.replace("Mi", "")) ?? 0;
					return { namespace: ns, name, cpu, memory, cpuInt, memInt };
			  })
			: [];

		return deploys.map((deploy) => {
			// resource usage average
			const cpuAvg =
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).reduce((total, obj) => total + obj.cpuInt, 0) /
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).length;

			deploy.cpuAvg = `${round(cpuAvg)}m`;

			const memAvg =
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).reduce((total, obj) => total + obj.memInt, 0) /
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).length;

			deploy.memoryAvg = `${round(memAvg)}Mi`;

			if (deploy.cpuAvg === "NaNm") deploy.cpuAvg = "";
			if (deploy.memoryAvg === "NaNMi") deploy.memoryAvg = "";

			// resource usage recommend
			deploy.cpuRecommend = (deploy.cpuAvg ? toInteger(deploy.cpuAvg.replace("m", "")) : 0) * 1.5 + "m";
			deploy.memoryRecommend = (deploy.memoryAvg ? toInteger(deploy.memoryAvg.replace("Mi", "")) : 0) * 1.5 + "Mi";

			// resource usage capacity
			deploy.cpuCapacity =
				deploy.spec.template.spec.containers.find((cont) => typeof cont.resources?.limits?.cpu !== "undefined")?.resources?.limits?.cpu || "";

			deploy.memoryCapacity =
				deploy.spec.template.spec.containers.find((cont) => typeof cont.resources?.limits?.memory !== "undefined")?.resources?.limits
					?.memory || "";

			return deploy;
		});
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getStatefulSets > ${context} >`, e);
		return [];
	}
}

/**
 * Get all statefulsets of a cluster
 */
export async function getAllStatefulSets(options: GetKubeDeployOptions = {}) {
	const { context, filterLabel, skipOnError, metrics = true } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("get", "statefulset", "-A");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);

		// get pods usage
		const usageStr = metrics ? execaCommandSync(`kubectl --context=${context} top pod --no-headers=true -A`).stdout : "";
		const podUsages = metrics
			? usageStr.split("\n").map((line) => {
					const [ns, name, cpu = "0m", memory = "0Mi"] = line.trim().split(/\s+/);
					const cpuInt = toInteger(cpu.replace("m", "")) ?? 0;
					const memInt = toInteger(memory.replace("Mi", "")) ?? 0;
					return { namespace: ns, name, cpu, memory, cpuInt, memInt };
			  })
			: [];

		return (items as KubeStatefulSet[]).map((deploy) => {
			// resource usage average
			const cpuAvg =
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).reduce((total, obj) => total + obj.cpuInt, 0) /
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).length;

			deploy.cpuAvg = `${round(cpuAvg)}m`;

			const memAvg =
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).reduce((total, obj) => total + obj.memInt, 0) /
				podUsages.filter((pod) => pod.name.indexOf(deploy.metadata.name) === 0).length;

			deploy.memoryAvg = `${round(memAvg)}Mi`;

			if (deploy.cpuAvg === "NaNm") deploy.cpuAvg = "";
			if (deploy.memoryAvg === "NaNMi") deploy.memoryAvg = "";

			// resource usage recommend
			deploy.cpuRecommend = (deploy.cpuAvg ? toInteger(deploy.cpuAvg.replace("m", "")) : 0) * 1.5 + "m";
			deploy.memoryRecommend = (deploy.memoryAvg ? toInteger(deploy.memoryAvg.replace("Mi", "")) : 0) * 1.5 + "Mi";

			// resource usage capacity
			deploy.cpuCapacity =
				deploy.spec.template.spec.containers.find((cont) => typeof cont.resources?.limits?.cpu !== "undefined")?.resources?.limits?.cpu || "";

			deploy.memoryCapacity =
				deploy.spec.template.spec.containers.find((cont) => typeof cont.resources?.limits?.memory !== "undefined")?.resources?.limits
					?.memory || "";

			return deploy;
		});
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllStatefulSets > ${context} >`, e);
		return [];
	}
}

/**
 * Get a StatefulSet in a namespace
 */
export async function getStatefulSet(name: string, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError, output } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "get", "statefulset", name);

		if (!output || output === "json") args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return !output || output === "json" ? (JSON.parse(stdout) as KubeStatefulSet) : stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getStatefulSet > ${context} >`, e);
		return;
	}
}

/**
 * Get StatefulSets in a namespace by filter labels
 */
export async function getStatefulSetsByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "get", "statefulset");

		if (filterLabel) args.push(`-l`, filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout) as KubeStatefulSet[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getStatefulSet > ${context} >`, e);
		return;
	}
}

/**
 * Scale replicas of a StatefulSet in a namespace
 */
export async function scaleStatefulSet(name: string, replicas: number, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "scale", "statefulset", name, `--replicas=${replicas}`);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] scaleStatefulSet >`, e);
		return;
	}
}

/**
 * Delete a StatefulSet in a namespace
 */
export async function deleteStatefulSet(name, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "statefulset", name);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteStatefulSet > ${context} >`, e);
		return;
	}
}

/**
 * Delete StatefulSets in a namespace by label filter
 */
export async function deleteStatefulSetsByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);
		args.push("-n", namespace, "delete", "statefulset");

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteStatefulSetsByFilter > ${context} >`, e);
		return;
	}
}

/**
 * Create service by name
 * @param namespace @default "default"
 */
export async function createService(name, namespace = "default", options: KubeGenericOptions = {}) {
	throw new Error(`This feature is under development.`);

	// const { execa, execaCommand, execaSync, execaCommandSync } = await import("execa");
	// const { context, skipOnError } = options;
	// try {
	// 	const args = [];
	// 	if (context) args.push(`--context=${context}`);

	// 	args.push("-n", namespace, "get", "svc", name);

	// 	args.push("-o", "json");

	// 	const { stdout } = await execa("kubectl", args);
	// 	return JSON.parse(stdout) as KubeService;
	// } catch (e) {
	// 	if (!skipOnError) logError(`[KUBE_CTL] getService >`, e);
	// 	return;
	// }
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

		if (!options?.output || options?.output === "json") args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return !options?.output || options?.output === "json" ? (JSON.parse(stdout) as KubeService) : stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getService > ${context} >`, e);
		return;
	}
}

/**
 * Get services in a namespace
 * @param namespace @default "default"
 * @param labelFilter Filter by labels @example "phase!=prerelease,app=abc-xyz"
 */
export async function getServices(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, skipOnError, filterLabel } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "svc");

		if (filterLabel) args.push("-l", filterLabel);

		if (!options?.output || options?.output === "json") args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return !options?.output || options?.output === "json" ? (items as KubeService[]) : stdout;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllServices > ${context} >`, e);
		return [];
	}
}

/**
 * Get all services in a cluster
 * @param labelFilter Filter by labels @example "phase!=prerelease,app=abc-xyz"
 */
export async function getAllServices(options: KubeCommandOptions = {}) {
	const { context, skipOnError, filterLabel } = options;

	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("get", "svc");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-A");
		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items as KubeService[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllServices > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] deleteService > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] deleteServiceByFilter > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] getPod > ${context} >`, e);
		return;
	}
}

/**
 * Get pods in a namespace
 * @param namespace @default "default"
 */
export async function getPods(namespace = "default", options: GetKubeDeployOptions = {}) {
	const { context, filterLabel, skipOnError, metrics = true, isDebugging } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "pod");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		// console.log(`[GET PODS] Command :>> kubectl ${args.join(" ")}`);
		if (isDebugging) console.log(`[GET PODS] Command: "kubectl ${args.join(" ")}"`);
		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);

		if (!metrics) return items as KubePod[];

		// get resource usage
		const { stdout: usageStr } = execaCommandSync(`kubectl --context=${context} -n ${namespace} top pod --no-headers=true`);
		const usage = usageStr.split("\n").map((line) => {
			const [name, cpu, memory] = line.trim().split(/\s+/);
			return { namespace, name, cpu, memory };
		});

		return (items as KubePod[]).map((item) => {
			// usage
			const _usage = usage.find((n) => n.name === item.metadata.name);
			if (_usage) {
				item.cpu = _usage.cpu;
				item.memory = _usage.memory;
			}
			return item;
		});
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getPods > ${context} >`, e);
		return [];
	}
}

/**
 * Get all pods in a cluster
 */
export async function getAllPods(options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("get", "pod");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-A", "-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);

		// get resource usage
		const { stdout: usageStr } = execaCommandSync(`kubectl --context=${context} top pod --no-headers=true -A`);
		const usage = usageStr.split("\n").map((line) => {
			const [ns, name, cpu, memory] = line.trim().split(/\s+/);
			return { namespace: ns, name, cpu, memory };
		});
		// console.log("usage :>> ", usage);
		return (items as KubePod[]).map((item) => {
			// usage
			const _usage = usage.find((n) => n.name === item.metadata.name);
			if (_usage) {
				item.cpu = _usage.cpu;
				item.memory = _usage.memory;
			}
			return item;
		});
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllPods > ${context} >`, e);
		return [];
	}
}

/**
 * Alias function of `getPods()`
 */
export const getPodsByFilter = getPods;

export async function deletePod(name: string, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "delete", "pod", name);

		const { stdout } = await execa("kubectl", args);
		return stdout as string;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deletePod > ${context} >`, e);
		return;
	}
}

export async function deletePodsByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, skipOnError, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "delete", "pod");

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout as string;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deletePodsByFilter > ${context} >`, e);
		return;
	}
}

export async function logPod(
	name,
	namespace = "default",
	options: KubeGenericOptions & { timestamps?: boolean; prefix?: boolean; previous?: boolean } = {}
) {
	const { context, skipOnError, timestamps, prefix, previous } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "logs", name);

		// options
		if (timestamps) args.push("--timestamps");
		if (prefix) args.push("--prefix");
		if (previous) args.push("--previous");

		const { stdout, stderr } = await execa("kubectl", args);
		return stdout || stderr;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] logPod > ${context} >`, e);
		return e.toString() as string;
	}
}

export async function logPodByFilter(
	namespace = "default",
	options: KubeCommandOptions & { timestamps?: boolean; prefix?: boolean; previous?: boolean } = {}
) {
	const { context, skipOnError, filterLabel, timestamps, prefix, previous } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "logs");

		if (filterLabel) args.push("-l", filterLabel);

		// options
		if (timestamps) args.push("--timestamps");
		if (prefix) args.push("--prefix");
		if (previous) args.push("--previous");

		const { stdout, stderr } = await execa("kubectl", args);
		return stdout || stderr;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] logPodByFilter > ${context} >`, e);
		return e.toString() as string;
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
		if (!skipOnError) logError(`[KUBE_CTL] setEnvVar > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] setEnvVar > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] deleteEnvVar > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] deleteEnvVar > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] getAllPods > ${context} >`, e);
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
		if (!skipOnError) logError(`[KUBE_CTL] getAllPods > ${context} >`, e);
		return [];
	}
}

// ------------------- PERSISTENT VOLUME -----------------------

/**
 * Get PersistentVolume by name
 */
export async function getPersistentVolume(name, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "pv", name);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout) as V1PersistentVolume;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getPersistentVolume > ${context} >`, e);
		return;
	}
}

/**
 * Get PersistentVolumes in a namespace
 * @param namespace @default "default"
 */
export async function getPersistentVolumes(namespace = "default", options: GetKubeDeployOptions = {}) {
	const { context, filterLabel, skipOnError, metrics = true } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "pv");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items as V1PersistentVolume[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getPersistentVolumes > ${context} >`, e);
		return [];
	}
}

/**
 * Get all PersistentVolumes in a cluster
 */
export async function getAllPersistentVolumes(options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("get", "pv");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-A", "-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items as V1PersistentVolume[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllPersistentVolumes > ${context} >`, e);
		return [];
	}
}

/**
 * Alias function of `getPods()`
 */
export const getPersistentVolumesByFilter = getPersistentVolumes;

export async function deletePersistentVolume(name: string, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "delete", "pv", name);

		const { stdout } = await execa("kubectl", args);
		return stdout as string;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deletePersistentVolume > ${context} >`, e);
		return;
	}
}

export async function deletePersistentVolumesByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, skipOnError, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "delete", "pv");

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout as string;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deletePersistentVolumesByFilter > ${context} >`, e);
		return;
	}
}

// ------------------- PERSISTENT VOLUME CLAIM -----------------------

/**
 * Get PersistentVolumeClaim by name
 */
export async function getPersistentVolumeClaim(name, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "pvc", name);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout) as V1PersistentVolumeClaim;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getPersistentVolumeClaim > ${context} >`, e);
		return;
	}
}

/**
 * Get PersistentVolumeClaims in a namespace
 * @param namespace @default "default"
 */
export async function getPersistentVolumeClaims(namespace = "default", options: GetKubeDeployOptions = {}) {
	const { context, filterLabel, skipOnError, metrics = true } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "pvc");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items as V1PersistentVolumeClaim[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getPersistentVolumeClaims > ${context} >`, e);
		return [];
	}
}

/**
 * Get all PersistentVolumes in a cluster
 */
export async function getAllPersistentVolumeClaims(options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("get", "pvc");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-A", "-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items as V1PersistentVolumeClaim[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllPersistentVolumeClaims > ${context} >`, e);
		return [];
	}
}

/**
 * Alias function of `getPods()`
 */
export const getPersistentVolumeClaimsByFilter = getPersistentVolumeClaims;

export async function deletePersistentVolumeClaim(name: string, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "delete", "pvc", name);

		const { stdout } = await execa("kubectl", args);
		return stdout as string;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deletePersistentVolumeClaim > ${context} >`, e);
		return;
	}
}

export async function deletePersistentVolumeClaimsByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, skipOnError, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "delete", "pvc");

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout as string;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deletePersistentVolumeClaimsByFilter > ${context} >`, e);
		return;
	}
}

// ------------------- STORAGE CLASS -----------------------

/**
 * Get Storage Class by name
 */
export async function getStorageClass(name, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "sc", name);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		return JSON.parse(stdout) as V1StorageClass;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getStorageClass > ${context} >`, e);
		return;
	}
}

/**
 * Get pods in a namespace
 * @param namespace @default "default"
 */
export async function getStorageClasses(namespace = "default", options: GetKubeDeployOptions = {}) {
	const { context, filterLabel, skipOnError, metrics = true } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "get", "sc");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items as V1StorageClass[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getStorageClasses > ${context} >`, e);
		return [];
	}
}

/**
 * Get all pods in a cluster
 */
export async function getAllStorageClasses(options: KubeCommandOptions = {}) {
	const { context, filterLabel, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("get", "sc");

		if (filterLabel) args.push("-l", filterLabel);

		args.push("-A", "-o", "json");

		const { stdout } = await execa("kubectl", args);
		const { items } = JSON.parse(stdout);
		return items as V1StorageClass[];
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] getAllStorageClasses > ${context} >`, e);
		return [];
	}
}

/**
 * Alias function of `getPods()`
 */
export const getStorageClassesByFilter = getPods;

export async function deleteStorageClass(name: string, namespace = "default", options: KubeGenericOptions = {}) {
	const { context, skipOnError } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "delete", "sc", name);

		const { stdout } = await execa("kubectl", args);
		return stdout as string;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteStorageClass > ${context} >`, e);
		return;
	}
}

export async function deleteStorageClassesByFilter(namespace = "default", options: KubeCommandOptions = {}) {
	const { context, skipOnError, filterLabel } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "delete", "sc");

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout as string;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteStorageClassesByFilter > ${context} >`, e);
		return;
	}
}

export async function kubectlAnnotateDeployment(
	keyAndValue: string,
	deploymentName: string = "",
	namespace = "default",
	options: KubeCommandOptions & { overwrite?: boolean } = { overwrite: true }
) {
	const { context, skipOnError, filterLabel, overwrite = true } = options;
	try {
		const args = [];
		if (context) args.push(`--context=${context}`);

		args.push("-n", namespace, "annotate");

		if (overwrite) args.push("--overwrite");

		if (deploymentName) {
			args.push(`deployment/${deploymentName}`);
		} else {
			args.push("deployment");
		}

		// annotation: key=value
		args.push(keyAndValue);
		// args.push(`kubernetes.io/change-cause="${keyAndValue}"`);
		// args.push(`description='${keyAndValue}'`);

		if (filterLabel) args.push("-l", filterLabel);

		const { stdout } = await execa("kubectl", args);
		return stdout as string;
	} catch (e) {
		if (!skipOnError) logError(`[KUBE_CTL] deleteStorageClassesByFilter > ${context} >`, e);
		return;
	}
}
