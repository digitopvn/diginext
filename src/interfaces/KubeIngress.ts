export interface KubeIngress {
	/**
	 * @example networking.k8s.io/v1
	 */
	apiVersion?: string;
	kind?: "Ingress";
	metadata?: {
		name?: string;
		namespace?: string;
		labels?: {
			[key: string]: string;
		};
		annotations?: { [key: string]: string };
	};
	spec?: {
		tls?: { hosts?: string[]; secretName?: string }[];
		rules?: {
			host?: string;
			http?: {
				paths?: { path?: string; pathType?: string; backend?: { service?: { name?: string; port?: { number?: number; name?: string } } } }[];
			};
		}[];
	};
}
