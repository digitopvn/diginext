import type { IResourceQuota } from "./IKube";
import type { ResourceQuotaSize } from "./SystemTypes";

export interface KubeDeployment {
	apiVersion?: string;
	kind?: string;
	metadata?: {
		name?: string;
		namespace?: string;
		labels: {
			[key: string]: string;
		};
	};
	spec?: {
		replicas?: number;
		selector?: {
			matchLabels?: {
				app?: string;
			};
		};
		template?: {
			metadata?: {
				labels?: {
					[key: string]: string;
				};
			};
			spec?: {
				containers?: {
					name?: string;
					image?: string;
					ports?: { containerPort?: number }[];
					resources?: IResourceQuota;
					env?: { name?: string; value?: any }[];
				}[];
				imagePullSecrets?: { name?: string }[];
			};
		};
	};
	status?: {
		conditions?: {
			lastTransitionTime?: string;
			lastUpdateTime?: string;
			message?: string;
			reason?: string;
			status?: string;
			type?: string;
		}[];
		observedGeneration?: number;
		replicas?: number;
		readyReplicas?: number;
		unavailableReplicas?: number;
		availableReplicas?: number;
		updatedReplicas?: number;
	};
	// extras
	clusterSlug?: string;
	/**
	 * Cluster's short name
	 * @deprecated
	 */
	clusterShortName?: string;
	/**
	 * Cluster ID
	 */
	cluster?: string;
	/**
	 * Workspace ID
	 */
	workspace?: string;
	/**
	 * Usage
	 */
	cpuAvg?: string;
	cpuCapacity?: string;
	cpuRecommend?: string;
	memoryAvg?: string;
	memoryCapacity?: string;
	memoryRecommend?: string;
	size?: ResourceQuotaSize;
}
