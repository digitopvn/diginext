export interface ContainerRegistrySecretOptions {
	/**
	 * Registry slug
	 */
	registrySlug: string;
	/**
	 * Slug of targeted cluster to create new `imagePullSecrets`
	 */
	clusterSlug: string;
	/**
	 * Targeted namespace to create new `imagePullSecrets`
	 */
	namespace?: string;
}

export interface DockerRegistryCredentials {
	/**
	 * Your private docker registry server
	 * @default https://index.docker.io/v1/
	 */
	server?: string;
	/**
	 * Docker username
	 */
	username?: string;
	/**
	 * Docker account's password
	 */
	password?: string;
	/**
	 * `[OPTIONAL]`
	 * Docker account's email
	 */
	email?: string;
}
