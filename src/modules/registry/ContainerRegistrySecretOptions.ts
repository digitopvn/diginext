export interface ContainerRegistrySecretOptions {
	/**
	 * Registry slug
	 */
	registrySlug: string;
	/**
	 * Short name of targeted cluster to create new `imagePullSecrets`
	 */
	clusterShortName: string;
	/**
	 * Targeted namespace to create new `imagePullSecrets`
	 */
	namespace?: string;
	/**
	 * Should create new `imagePullSecrets` in a targeted namespace or not.
	 * @default false
	 */
	shouldCreateSecretInNamespace?: boolean;
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
