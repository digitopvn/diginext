export interface KubeService {
	apiVersion?: string;
	kind?: "Service";
	metadata?: {
		name?: string;
		namespace?: string;
		labels?: {
			[key: string]: string;
		};
	};
	spec?: {
		type?: string;
		ports?: { port?: number; targetPort?: number }[];
		selector?: { app?: string };
	};
	// extras
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
