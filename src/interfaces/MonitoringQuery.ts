export interface MonitoringQueryFilter {
	/**
	 * Cluster's ID or SLUG
	 */
	cluster?: string;
	/**
	 * Resource's name
	 */
	name?: string;
	/**
	 * Namespace's name
	 */
	namespace?: string;
	/**
	 * Filter by labels
	 */
	labels?: Record<string, string>;
}

export interface MonitoringQueryOptions {
	/**
	 * Sort the results based on metadata.
	 * @example { order: { "metadata.creationTimestamp": -1 } }
	 */
	order?: Record<string, 1 | -1>;
	/**
	 * Alias of `order`
	 */
	sort?: Record<string, 1 | -1>;
	/**
	 * If `TRUE`, return the closest results of filter
	 * @default false
	 */
	search?: boolean;
	/**
	 * Output data type (JSON or YAML)
	 * @default "json"
	 */
	output?: "json" | "yaml";
	/**
	 * Debug mode enabling
	 * @default false
	 */
	isDebugging?: boolean;
}

export interface MonitoringQueryParams {
	/**
	 * Cluster's ID or SLUG
	 */
	cluster?: string;
	/**
	 * Resource's name
	 */
	name?: string;
	/**
	 * Namespace's name
	 */
	namespace?: string;
	/**
	 * Filter by labels
	 */
	labels?: any;
	/**
	 * Sort the results based on metadata.
	 * @example { order: { "metadata.creationTimestamp": -1 } }
	 */
	order?: any;
	/**
	 * Alias of `order`
	 */
	sort?: any;
	/**
	 * Output data type (JSON or YAML)
	 * @default "json"
	 */
	output?: "json" | "yaml";
	/**
	 * Debug mode enabling
	 * @default false
	 */
	isDebugging?: boolean;
}
