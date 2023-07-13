export interface KubeSecret {
	apiVersion?: string;
	kind?: "Secret";
	type?: string;
	metadata?: {
		name?: string;
		namespace?: string;
	};
	data?: {
		[key: string]: string;
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
}
