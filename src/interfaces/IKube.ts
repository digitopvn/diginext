export interface IResourceQuota {
	limits?: {
		cpu?: string;
		memory?: string;
	};
	requests?: {
		cpu?: string;
		memory?: string;
	};
}
