export interface KubeService {
	apiVersion?: "v1";
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
}
