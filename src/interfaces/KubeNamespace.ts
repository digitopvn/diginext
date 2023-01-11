export interface KubeNamespace {
	apiVersion?: "v1";
	kind?: "Namespace";
	metadata?: {
		name?: string;
		namespace?: string;
		labels: {
			[key: string]: string;
		};
		creationTimestamp?: string;
	};
	spec?: {
		finalizers?: string[];
	};
	status?: {
		phase?: string;
	};
}
