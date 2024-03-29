import { existsSync } from "fs";
import path from "path";

import { CLI_DIR } from "@/config/const";
import type { ICluster } from "@/entities";
import { waitUntil } from "@/plugins";

import ClusterManager from "./index";
import { checkCertManagerInstalled, checkNginxIngressInstalled } from "./stack-check";

export interface InstallStackOptions {
	skipable?: boolean;
	onUpdate?: (msg: string, type?: "log" | "error" | "warn") => void;
}

/**
 * Install `NGINX Ingress` stack to your cluster
 * @copyright https://kubernetes.github.io/ingress-nginx/
 */
export const installNginxIngressStack = async (cluster: ICluster, options: InstallStackOptions = {}) => {
	const { execa, execaCommand, execaSync, execaCommandSync } = await import("execa");
	const { slug, contextName: context, isVerified } = cluster;
	const { onUpdate } = options;

	if (!isVerified) throw new Error(`Cluster (${slug}) hasn't been verified yet.`);

	let nginxIngressInstalled = await checkNginxIngressInstalled(cluster);
	if (nginxIngressInstalled) {
		if (!options?.skipable) throw new Error(`Cluster already had "NGINX Ingress" Stack installed.`);
		return true;
	}

	// use Helm to install:
	const name = "ingress-nginx";
	const namespace = "ingress-nginx";
	const helmRepoURL = "https://kubernetes.github.io/ingress-nginx";
	const command = `helm upgrade --install ${name} ${name} --repo ${helmRepoURL} --namespace ${namespace} --create-namespace`;
	const stream = execaCommand(command);
	stream.stdio.forEach((_stdio) => {
		if (_stdio) {
			_stdio.on("data", (data) => {
				if (onUpdate) onUpdate(data.toString(), "log");
			});
		}
	});
	await stream;

	// verify the installation: Pending, Running, Succeeded, Failed, Unknown
	await waitUntil(async () => {
		let isStackFinished = false;
		const pods = await ClusterManager.getPodsByFilter(namespace);
		pods.map((pod) => {
			if (pod.status.phase !== "Pending") isStackFinished = true;
			if (pod.status.phase === "Running" || pod.status.phase === "Succeeded") nginxIngressInstalled = true;
		});
		return isStackFinished;
	});

	return nginxIngressInstalled;
};

/**
 * Install `CertManager` stack to your cluster
 * @copyright https://cert-manager.io/
 */
export const installCertManagerStack = async (cluster: ICluster, options: InstallStackOptions = {}) => {
	const { execa, execaCommand, execaSync, execaCommandSync } = await import("execa");
	const { slug, contextName: context, isVerified } = cluster;
	const { onUpdate } = options;

	if (!isVerified) throw new Error(`Cluster (${slug}) hasn't been verified yet.`);

	// check stack has been installed yet or not
	let isStackInstalled = await checkCertManagerInstalled(cluster);
	if (isStackInstalled) {
		if (!options?.skipable) throw new Error(`Cluster already had "CertManager" Stack installed.`);
		return true;
	}

	// add Helm repo
	await execaCommand(`helm repo add jetstack https://charts.jetstack.io && helm repo update`);

	// use Helm to install:
	const name = "cert-manager";
	const namespace = "cert-manager";
	const version = "v1.11.0";
	const command = `helm install ${name} jetstack/cert-manager --namespace ${namespace} --create-namespace --version ${version} --set installCRDs=true`;

	const stream = execaCommand(command);
	stream.stdio.forEach((_stdio) => {
		if (_stdio) {
			_stdio.on("data", (data) => {
				if (onUpdate) onUpdate(data.toString(), "log");
			});
		}
	});
	await stream;

	// verify the installation:
	await waitUntil(async () => {
		let isStackFinished = false;
		const pods = await ClusterManager.getPodsByFilter(namespace);
		pods.map((pod) => {
			if (pod.status.phase !== "Pending") isStackFinished = true;
			if (pod.status.phase === "Running" || pod.status.phase === "Succeeded") isStackInstalled = true;
		});
		return isStackFinished;
	});

	// create default "ClusterIssuer" for issuing Let's Encrypt SSL certificates
	if (isStackInstalled) {
		const clusterIssuerTemplateFile = path.resolve(CLI_DIR, "templates/cert-manager/cluster-issuer.yaml");
		if (!existsSync(clusterIssuerTemplateFile)) throw new Error(`[CERT MANAGER] ClusterIssuer template not found.`);

		const clusterIssuerDeploy = await ClusterManager.kubectlApply(clusterIssuerTemplateFile, { context });
		console.log("clusterIssuerDeploy :>> ", clusterIssuerDeploy);
	}

	return isStackInstalled;
};
