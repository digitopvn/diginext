import type { ICluster } from "@/entities/Cluster";
import { clusterSchema } from "@/entities/Cluster";
import type { IQueryFilter, IQueryOptions } from "@/interfaces";
import ClusterManager from "@/modules/k8s";
import type { ClusterAuthOptions } from "@/modules/k8s/cluster-auth";
import { deleteClusterInKubeConfig } from "@/modules/k8s/kube-config";
import type { InstallStackOptions } from "@/modules/k8s/stack-install";

import BaseService from "./BaseService";

export class ClusterService extends BaseService<ICluster> {
	constructor() {
		super(clusterSchema);
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
