import type { ObjectId } from "mongodb";

import type { IUser } from "@/entities";

import type { KubeEnvironmentVariable } from "./EnvironmentVariable";
import type { AppStatus, ResourceQuotaSize } from "./SystemTypes";

export const availableSslTypes = ["letsencrypt", "custom", "none"] as const;
/**
 * @default "letsencrypt"
 */
export type SslType = typeof availableSslTypes[number];

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
	 * Cluster's slug
	 */
	cluster?: string;

	/**
	 * [Google Cloud] PROJECT_ID
	 * @deprecated
	 */
	project?: string;

	/**
	 * [Google Cloud] Region
	 * @deprecated
	 */
	region?: string;

	/**
	 * [Google Cloud] Zone
	 * @deprecated
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
	ssl?: SslType;

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
	 * Build tag is image's tag (no special characters, eg. "dot" or "comma")
	 * @example latest, v01, prerelease, alpha, beta,...
	 */
	buildTag: string;
	/**
	 * Alias of `buildTag`, use `buildTag` instead, this field will be removed soon.
	 * @deprecated
	 */
	buildNumber?: string;

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

	/**
	 * ID of the creator
	 */
	creator?: ObjectId | IUser;

	/**
	 * Update time
	 */
	updatedAt?: Date;

	/**
	 * Date when it's put to sleep
	 */
	sleepAt?: Date;

	/**
	 * Date when it's awaken
	 */
	awakeAt?: Date;

	/**
	 * Date when it's taken down
	 */
	tookDownAt?: Date;

	/**
	 * Deployment's status
	 */
	status?: AppStatus;

	/**
	 * Amount of ready instances
	 */
	readyCount?: number;

	/**
	 * A screenshot URL from build success
	 */
	screenshot?: string;
}
