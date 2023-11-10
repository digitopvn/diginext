import type { V1PersistentVolume, V1PersistentVolumeClaim } from "@kubernetes/client-node";

export interface KubePersistentVolume extends V1PersistentVolume {
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
}

export interface KubePersistentVolumeClaim extends V1PersistentVolumeClaim {
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
}
