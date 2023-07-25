import type { V1StatefulSet } from "@kubernetes/client-node";

import type { ResourceQuotaSize } from "./SystemTypes";

export interface KubeStatefulSet extends V1StatefulSet {
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
