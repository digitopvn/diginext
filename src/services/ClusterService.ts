import type { ICloudProvider } from "@/entities";
import type { ICluster } from "@/entities/Cluster";
import { clusterSchema } from "@/entities/Cluster";
import type { IQueryFilter, IQueryOptions } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import ClusterManager from "@/modules/k8s";
import type { ClusterAuthOptions } from "@/modules/k8s/cluster-auth";
import { deleteClusterInKubeConfig } from "@/modules/k8s/kube-config";
import type { InstallStackOptions } from "@/modules/k8s/stack-install";

import BaseService from "./BaseService";

export class ClusterService extends BaseService<ICluster> {
	constructor(ownership?: Ownership) {
		super(clusterSchema, ownership);
	}

	async updateOne(filter: IQueryFilter<ICluster>, data: any, options?: IQueryOptions): Promise<ICluster> {
		let cluster = await this.findOne(filter, { ...options, populate: ["provider"] });
		if (!cluster) {
			if (filter.owner) {
				throw new Error(`Unauthorized.`);
			} else {
				throw new Error(`Cluster not found.`);
			}
		}

		// get cloud provider of this cluster
		const cloudProvider = cluster.provider as ICloudProvider;
		if (!cloudProvider) throw new Error(`Cloud Provider not found.`);

		// validation - check cluster accessibility
		if (cloudProvider.shortName === "gcloud") {
			if (!cluster.serviceAccount && !data.serviceAccount) throw new Error(`Google Service Account (JSON) is required.`);
			if (!cluster.zone && !data.zone) throw new Error(`Google cluster zone is required.`);
		}
		if (cloudProvider.shortName === "digitalocean") {
			if (!cluster.apiAccessToken) throw new Error(`Digital Ocean API Access Token is required.`);
		}
		if (cloudProvider.shortName === "custom") {
			if (!cluster.kubeConfig && !data.kubeConfig) throw new Error(`Kube config data (YAML) is required.`);
		}

		// update to database
		cluster = await super.updateOne({ _id: cluster._id }, data, options);

		return cluster;
	}

	async delete(filter?: IQueryFilter<ICluster>, options?: IQueryOptions): Promise<{ ok: boolean; affected: number }> {
		// try to delete "context" in "~/.kube/config"
		try {
			const cluster = await this.findOne(filter, options);
			await deleteClusterInKubeConfig(cluster);
		} catch (e) {
			console.log("Unable to delete cluster in KUBE_CONFIG :>> ", e);
		}
		return super.delete(filter, options);
	}

	// verify accessibility...
	async authCluster(cluster: ICluster, options?: ClusterAuthOptions) {
		return ClusterManager.authCluster(cluster, options);
	}

	/**
	 * Check if required stacks are installed within the cluster
	 * @param cluster
	 */
	async checkStackInstalled(cluster: ICluster, options?: InstallStackOptions) {
		/**
		 * Check for required stack installations, if not -> install them:
		 */
		try {
			// [1] NGINX Ingress
			await ClusterManager.installNginxIngressStack(cluster, options);
			// [2] Cert Manager
			await ClusterManager.installCertManagerStack(cluster, options);

			return true;
		} catch (e) {
			return false;
		}
	}
}
