export interface ContainerRegistrySecretOptions {
	/**
	 * Registry slug
	 */
	registrySlug?: string;
	/**
	 * Cloud provider shortname
	 */
	providerShortName?: string;
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
