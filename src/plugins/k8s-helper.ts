export interface SimplifiedK8SResource {
	apiVersion?: string;
	kind?: string;
	metadata?: {
		creationTimestamp?: string;
		labels?: Record<string, string>;
		name?: string;
		namespace?: string;
		resourceVersion?: string;
		uid?: string;
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

export function simplifyK8SResourceData(item: any) {
	const compactItem: SimplifiedK8SResource = {};
	compactItem.apiVersion = item.apiVersion;
	compactItem.kind = item.kind;
	compactItem.metadata = item.metadata;
	compactItem.clusterSlug = item.clusterSlug;
	compactItem.clusterShortName = item.clusterShortName;
	compactItem.cluster = item.cluster;
	compactItem.workspace = item.workspace;
	return compactItem;
}

/**
 * Regular expression to match Kubernetes memory format
 * It looks for digits followed by either Ei, Pi, Ti, Gi, Mi, Ki, E, P, T, G, M, K, or nothing
 */
export function isValidKubernetesMemoryFormat(value: string) {
	const regex = /^(\d+)(Ei|Pi|Ti|Gi|Mi|Ki|E|P|T|G|M|K)?$/;

	// Test the value against the regular expression
	const isValid = regex.test(value);

	return isValid;
}
