export interface DeployEnvironment {
	/**
	 * Container registry slug
	 */
	registry?: string;
	/**
	 * Cloud provider's short name
	 */
	provider?: string;
	/**
	 * Cluster's short name
	 */
	cluster?: string;
	/**
	 * [Google Cloud] PROJECT_ID
	 */
	project?: string;
	/**
	 * [Google Cloud] Region
	 */
	region?: string;
	/**
	 * [Google Cloud] Zone
	 */
	zone?: string;

	/**
	 * Image URI of this app on the Container Registry.
	 * - Combined from: `<registry-image-base-url>/<project-slug>/<app-name-in-slug-case>`
	 * - No `tag` version at the end! (eg. `latest`, `beta`,...)
	 * @example
	 * asia.gcr.io/google-project-id/my-project-slug/my-app-slug
	 */
	imageURL?: string;

	/**
	 * Destination namespace name
	 */
	namespace?: string;
	/**
	 * Container quota resources
	 * @example
	 * "none" - {}
	 * "1x" - { requests: { cpu: `50m`, memory: `256Mi` }, limits: { cpu: `50m`, memory: `256Mi` } }
	 * "2x" - { requests: { cpu: `100m`, memory: `512Mi` }, limits: { cpu: `100m`, memory: `512Mi` } }
	 */
	size?: "none" | "1x" | "2x" | "3x" | "4x" | "5x" | "6x" | "7x" | "8x" | "9x" | "10x";
	shouldInherit?: boolean;
	redirect?: boolean;
	/**
	 * Container's scaling replicas
	 */
	replicas?: number;
	/**
	 * Container's port
	 */
	port?: number;
	basePath?: string;
	domains?: string[];
	cdn?: boolean;
	ssl?: "letsencrypt" | "custom" | "none";
	tlsSecret?: string;
	cliVersion?: string;
	/**
	 * Content of deployment YAML file
	 */
	deploymentYaml?: string;
	/**
	 * Content of prerelease deployment YAML file
	 */
	prereleaseDeploymentYaml?: string;
}
