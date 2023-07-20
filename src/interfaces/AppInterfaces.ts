import type { AppGitInfo, IFramework } from "@/entities";

import type { SslType } from "./DeployEnvironment";
import type { ResourceQuotaSize } from "./SystemTypes";

export interface CreateEnvVarsDto {
	/**
	 * App slug
	 */
	slug: string;
	/**
	 * Deploy environment name
	 * @example "dev" | "prod"
	 */
	env: string;
	/**
	 * Array of variables to be created on deploy environment in JSON format
	 */
	envVars: string;
}

export interface AppInputSchema {
	/**
	 * `REQUIRES`
	 * ---
	 * App's name
	 */
	name: string;

	/**
	 * `REQUIRES`
	 * ---
	 * Project's ID or slug
	 */
	project: string;

	/**
	 * `REQUIRES`
	 * ---
	 * Git provider ID
	 */
	gitProvider: string;

	/**
	 * OPTIONAL
	 * ---
	 * Framework's ID or slug or {Framework} instance
	 */
	framework?: string | IFramework;

	/**
	 * `OPTIONAL`
	 * ---
	 * A SSH URI of the source code repository or a detail information of this repository
	 * @example git@bitbucket.org:digitopvn/example-repo.git
	 */
	git?: string | AppGitInfo;

	/**
	 * `OPTIONAL`
	 * ---
	 * Should create new git repository on the selected git provider
	 * @default false
	 */
	shouldCreateGitRepo?: boolean;

	/**
	 * `OPTIONAL`
	 * ---
	 * ### [CAUTION]
	 * If `TRUE`, it will delete the existing git repo, then create a new one.
	 * @default false
	 */
	force?: boolean;
}

export interface DeployEnvironmentData {
	/**
	 * `REQUIRES`
	 * ---
	 * Container registry's slug
	 * @requires
	 */
	registry: string;

	/**
	 * `REQUIRES`
	 * ---
	 * Cluster's short name
	 * @requires
	 */
	cluster: string;

	/**
	 * `REQUIRES`
	 * ---
	 * Container's port
	 * @requires
	 */
	port: number;

	/**
	 * `REQUIRES`
	 * ---
	 * Image URI of this app on the Container Registry (without `TAG`).
	 * - Combined from: `<registry-image-base-url>/<project-slug>/<app-name-slug>`
	 * - **Don't** specify `tag` at the end! (eg. `latest`, `beta`,...)
	 * @default <registry-image-base-url>/<project-slug>/<app-name-slug>
	 * @example "asia.gcr.io/my-workspace/my-project/my-app"
	 */
	imageURL: string;

	/**
	 * Build tag is image's tag (no special characters, eg. "dot" or "comma")
	 * @example latest, v01, prerelease, alpha, beta,...
	 */
	buildTag: string;

	/**
	 * OPTIONAL
	 * ---
	 * Container's scaling replicas
	 * @default 1
	 */
	replicas?: number;

	/**
	 * OPTIONAL
	 * ---
	 * Destination namespace name, will be generated automatically by `<project-slug>-<env>` if not specified.
	 */
	namespace?: string;

	/**
	 * OPTIONAL
	 * ---
	 * Container quota resources
	 * @default 1x
	 * @example
	 * "none" - {}
	 * "1x" - { requests: { cpu: "20m", memory: "128Mi" }, limits: { cpu: "20m", memory: 128Mi" } }
	 * "2x" - { requests: { cpu: "40m", memory: "256Mi" }, limits: { cpu: "40m", memory: "256Mi" } }
	 * "3x" - { requests: { cpu: "80m", memory: "512Mi" }, limits: { cpu: "80m", memory: "512Mi" } }
	 * "4x" - { requests: { cpu: "160m", memory: "1024Mi" }, limits: { cpu: "160m", memory: "1024Mi" } }
	 * "5x" - { requests: { cpu: "320m", memory: "2048Mi" }, limits: { cpu: "320m", memory: "2048Mi" } }
	 * "6x" - { requests: { cpu: "640m", memory: "4058Mi" }, limits: { cpu: "640m", memory: "4058Mi" } }
	 * "7x" - { requests: { cpu: "1280m", memory: "2048Mi" }, limits: { cpu: "1280m", memory: "2048Mi" } }
	 * "8x" - { requests: { cpu: "2560m", memory: "8116Mi" }, limits: { cpu: "2560m", memory: "8116Mi" } }
	 * "9x" - { requests: { cpu: "5120m", memory: "16232Mi" }, limits: { cpu: "5120m", memory: "16232Mi" } }
	 * "10x" - { requests: { cpu: "10024m", memory: "32464Mi" }, limits: { cpu: "10024m", memory: "32464Mi" } }
	 */
	size?: ResourceQuotaSize;

	/**
	 * OPTIONAL
	 * ---
	 * Set to `false` if you DON'T want to inherit the Ingress YAML config from the previous deployment
	 * @default true
	 */
	shouldInherit?: boolean;

	/**
	 * OPTIONAL
	 * ---
	 * Set to `false` if you don't want to redirect all the secondary domains to the primary domain.
	 * @default true
	 */
	redirect?: boolean;

	/**
	 * OPTIONAL
	 * ---
	 * Set `true` if you want to use a generated domain for this deploy environment.
	 * @default false
	 */
	useGeneratedDomain?: boolean;

	/**
	 * OPTIONAL
	 * ---
	 * List of application's domains.
	 * @default []
	 */
	domains?: string[];

	/**
	 * OPTIONAL
	 * ---
	 * Flag to enable CDN for this application
	 * @default false
	 */
	cdn?: boolean;

	/**
	 * OPTIONAL
	 * ---
	 * Select your SSL Certificate Issuer, one of:
	 * - `letsencrypt`
	 * - `custom`
	 * - `none`
	 * @default letsencrypt
	 */
	ssl?: SslType;

	/**
	 * OPTIONAL
	 * ---
	 * Secret name to hold the key of SSL, will be automatically generated with the primary domain.
	 * Only need to specify when using "custom" SSL (which is the SSL from third-party issuer)
	 */
	tlsSecret?: string;

	/**
	 * OPTIONAL
	 * ---
	 * Kubernetes Ingress Class
	 * @default nginx
	 * @example "nginx" | "kong"
	 */
	ingress?: string;

	/**
	 * OPTIONAL
	 * ---
	 * Username of the person who update the app
	 */
	lastUpdatedBy?: string;
}
