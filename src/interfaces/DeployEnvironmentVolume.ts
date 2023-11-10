export type DeployEnvironmentVolume = {
	/**
	 * Volume name
	 */
	name: string;
	/**
	 * Kubernetes node name
	 */
	node: string;
	/**
	 * Volume size
	 * @example "5Gi", "500Mi"
	 */
	size: string;
	/**
	 * Kubernetes Storage Class
	 */
	storageClass: string;
	/**
	 * Map directory on the host server to this volume
	 */
	// hostPath: string;
	/**
	 * Location of mapped directory inside the container into this volume
	 */
	mountPath: string;
};
