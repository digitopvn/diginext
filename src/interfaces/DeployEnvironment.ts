import type { KubeEnvironmentVariable } from "./EnvironmentVariable";
import type { ResourceQuotaSize } from "./InputOptions";

export interface ClientDeployEnvironmentConfig {
	/**
	 * Image URI of this app on the Container Registry.
	 * - Combined from: `<registry-image-base-url>/<project-slug>/<app-name-slug>`
	 * - If you build from the source code, don't specify `tag` at the end! (eg. `latest`, `beta`,...)
	 * @example
	 * asia.gcr.io/google-project-id/my-project-slug/my-app-slug
	 */
	imageURL?: string;

	/**
	 * Destination namespace name
	 */
	namespace?: string;

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
	 * Container quota resources
	 * @example
	 * "none" - {}
	 * "1x" - { requests: { cpu: `50m`, memory: `256Mi` }, limits: { cpu: `50m`, memory: `256Mi` } }
	 * "2x" - { requests: { cpu: `100m`, memory: `512Mi` }, limits: { cpu: `100m`, memory: `512Mi` } }
	 */
	size?: ResourceQuotaSize;

	/**
	 * Set to `false` if you DON'T want to inherit the Ingress YAML config from the previous deployment
	 * @default true
	 */
	shouldInherit?: boolean;

	/**
	 * Set to `false` if you don't want to redirect all the secondary domains to the primary domain.
	 * @default true
	 */
	redirect?: boolean;

	/**
	 * Container's scaling replicas
	 * @default 1
	 */
	replicas?: number;

	/**
	 * Container's port
	 * @requires
	 */
	port?: number;

	/**
	 * Application base path in the endpoint URL
	 * @default "/"
	 * @example `http://example.com/${base_bath_here}`
	 */
	basePath?: string;

	/**
	 * List of application's domains
	 */
	domains?: string[];

	/**
	 * Flag to enable CDN for this application
	 * @default false;
	 */
	cdn?: boolean;

	/**
	 * SSL Certificate Issuer
	 * @default "letsencrypt"
	 */
	ssl?: "letsencrypt" | "custom" | "none";

	/**
	 * Secret name to hold the key of SSL, will be automatically generated.
	 * Only need to specify when using "custom" SSL (which is the SSL from third-party issuer)
	 */
	tlsSecret?: string;

	/**
	 * Kubernetes Ingress Class
	 * @example "nginx" | "kong"
	 */
	ingress?: string;
}

/**
 * A deployment's environment of the application.
 */
export interface DeployEnvironment extends ClientDeployEnvironmentConfig {
	/**
	 * The CLI version
	 */
	cliVersion?: string;

	/**
	 * Content of namespace YAML file
	 */
	namespaceYaml?: string;

	/**
	 * Content of deployment YAML file
	 */
	deploymentYaml?: string;

	/**
	 * Content of prerelease deployment YAML file
	 */
	prereleaseDeploymentYaml?: string;

	/**
	 * Prerelease endpoint URL
	 */
	prereleaseUrl?: string;

	/**
	 * Collection array of environment variables
	 */
	envVars?: KubeEnvironmentVariable[];

	/**
	 * User name of the first person who deploy on this environment.
	 */
	createdBy?: string;

	/**
	 * User name of the last person who deploy or update this environment.
	 */
	lastUpdatedBy?: string;
}
