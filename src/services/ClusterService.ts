import type { ICloudProvider } from "@/entities";
import type { ICluster } from "@/entities/Cluster";
import { clusterSchema } from "@/entities/Cluster";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import ClusterManager from "@/modules/k8s";
import type { ClusterAuthOptions } from "@/modules/k8s/cluster-auth";
import { createImagePullSecrets } from "@/modules/k8s/image-pull-secret";
import { deleteClusterInKubeConfig } from "@/modules/k8s/kube-config";
import type { InstallStackOptions } from "@/modules/k8s/stack-install";
import type { ContainerRegistrySecretOptions } from "@/modules/registry/ContainerRegistrySecretOptions";
import { checkPermissions, checkPermissionsByFilter, checkPermissionsById } from "@/plugins/user-utils";

import BaseService from "./BaseService";

export class ClusterService extends BaseService<ICluster> {
	constructor(ownership?: Ownership) {
		super(clusterSchema, ownership);
	}

	find(filter?: IQueryFilter<ICluster>, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination): Promise<ICluster[]> {
		// check access permissions
		if (this.user?.allowAccess?.clusters?.length) filter = { $or: [filter, { _id: { $in: this.user?.allowAccess?.clusters } }] };

		return super.find(filter, options, pagination);
	}

	async update(filter: IQueryFilter<ICluster>, data: any, options?: IQueryOptions): Promise<ICluster[]> {
		// check permissions
		await checkPermissionsByFilter("clusters", this, filter, this.user);

		return super.update(filter, data, options);
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

		// check permissions
		await checkPermissions("clusters", cluster, this.user);

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

			// check permissions
			await checkPermissionsById("clusters", cluster._id, this.user);

			await deleteClusterInKubeConfig(cluster);
		} catch (e) {
			throw new Error(`Unable to delete cluster: ${e}`);
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

	/**
	 * Create "imagePullSecret" in a namespace of a cluster
	 */
	async createImagePullSecret(filter: IQueryFilter<any>, data: ContainerRegistrySecretOptions, options?: { isDebugging?: boolean }) {
		// find cluster
		const { clusterSlug } = data;
		let cluster = await this.findOne({ slug: clusterSlug });
		if (!cluster) {
			if (filter.owner) {
				throw new Error(`Unauthorized.`);
			} else {
				throw new Error(`Cluster not found.`);
			}
		}

		// check permissions
		await checkPermissionsById("clusters", cluster._id, this.user);

		return createImagePullSecrets(data);
	}
}
