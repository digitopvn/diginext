export interface KubeConfigCluster {
	cluster: {
		["certificate-authority-data"]?: string;
		server?: string;
	};
	name: string;
}

export interface KubeConfigContext {
	context: {
		cluster?: string;
		user?: string;
	};
	name: string;
}

export interface KubeConfigUser {
	name: string;
	user: {
		["client-certificate-data"]?: string;
		["client-key-data"]?: string;
		exec?: {
			apiVersion?: string;
			args?: string[];
			command?: string;
			env?: string;
			interactiveMode?: string;
			provideClusterInfo?: boolean;
			installHint?: string;
		};
	};
}

export interface KubeConfig {
	clusters: KubeConfigCluster[];
	contexts: KubeConfigContext[];
	["current-context"]: string;
	users: KubeConfigUser[];
}
