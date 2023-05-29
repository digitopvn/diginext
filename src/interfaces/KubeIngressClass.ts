export interface KubeIngressClass {
	apiVersion?: string;
	kind?: string;
	metadata?: {
		annotations?: {
			[key: string]: string;
		};
		creationTimestamp?: string;
		generation?: number;
		labels?: {
			[key: string]: string;
		};
		name?: string;
		resourceVersion?: string;
		uid?: string;
	};
	spec?: {
		controller?: string;
	};
}
