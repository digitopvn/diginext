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
}
