import type { Cluster } from "@/entities";

import ClusterManager from ".";

/**
 * Check the cluster has NGINX Ingress installed or not
 * @copyright https://kubernetes.github.io/ingress-nginx/
 * @returns Error message in string or TRUE
 */
export const checkNginxIngressInstalled = async (cluster: Cluster) => {
	const { shortName, contextName: context, isVerified } = cluster;

	if (!isVerified) return `This cluster (${shortName}) hasn't been verified yet.`;

	const nginxIngressNamespaces = await ClusterManager.getAllNamespaces({ context, filterLabel: "kubernetes.io/metadata.name=ingress-nginx" });

	return nginxIngressNamespaces.length > 0;
};

/**
 * Check the cluster has Cert Manager installed or not
 * @copyright https://cert-manager.io/
 * @returns Error message in string or TRUE
 */
export const checkCertManagerInstalled = async (cluster: Cluster) => {
	const { shortName, contextName: context, isVerified } = cluster;

	if (!isVerified) return `This cluster (${shortName}) hasn't been verified yet.`;

	const certManagerNamespaces = await ClusterManager.getAllNamespaces({ context, filterLabel: "kubernetes.io/metadata.name=cert-manager" });

	return certManagerNamespaces.length > 0;
};
