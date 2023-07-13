import type { ICluster } from "@/entities";
import { contains } from "@/plugins/string";

import ClusterManager from "./index";

/**
 * Check the cluster has NGINX Ingress installed or not
 * @copyright https://kubernetes.github.io/ingress-nginx/
 * @returns Error message in string or TRUE
 */
export const checkNginxIngressInstalled = async (cluster: ICluster) => {
	const { slug, contextName: context, isVerified } = cluster;

	if (!isVerified) return `Cluster (${slug}) hasn't been verified yet.`;

	const allNamespaces = await ClusterManager.getAllNamespaces({ context });
	let nginxIngressInstalled = false;

	if (allNamespaces.length > 0) {
		allNamespaces.map((ns) => {
			if (contains(ns.metadata.name, ["nginx", "ingress"])) nginxIngressInstalled = true;
		});
	}

	return nginxIngressInstalled;
};

/**
 * Check the cluster has Cert Manager installed or not
 * @copyright https://cert-manager.io/
 * @returns Error message in string or TRUE
 */
export const checkCertManagerInstalled = async (cluster: ICluster) => {
	const { slug, contextName: context, isVerified } = cluster;

	if (!isVerified) return `Cluster (${slug}) hasn't been verified yet.`;

	const certManagerNamespaces = await ClusterManager.getAllNamespaces({ context, filterLabel: "kubernetes.io/metadata.name=cert-manager" });

	return certManagerNamespaces.length > 0;
};
