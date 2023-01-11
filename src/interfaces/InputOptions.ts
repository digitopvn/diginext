import type { App, Framework, Project, Workspace } from "@/entities";

/**
 * Các giá trị đầu vào của CLI
 */
export type InputOptions = {
	/**
	 * For testing purpose
	 */
	isDebugging?: boolean;

	/**
	 * Print the logs and keep watching until the end
	 */
	tail?: boolean;

	/**
	 * Tracking information
	 */
	statistics?: {
		author?: string;
		startTime?: Date;
		endTime?: Date;
	};

	/**
	 * Define if the command was executed on local machine or server machine
	 */
	isLocal?: boolean;

	/**
	 * Version string
	 */
	version?: string;

	/**
	 * Ownership
	 */
	username?: string;
	userId?: string;
	workspace?: Workspace;
	workspaceId?: string;

	/**
	 * Target's name
	 */
	name?: string;
	slug?: string;

	/**
	 *
	 */
	token?: string;

	/**
	 *
	 */
	refreshToken?: string;

	/**
	 *
	 */
	input?: string;

	/**
	 *
	 */
	key?: string;

	/**
	 *
	 */
	data?: string;

	/**
	 *
	 */
	value?: string;

	/**
	 *
	 */
	filePath?: string;

	/**
	 *
	 */
	path?: string;

	/**
	 *
	 */
	url?: string;

	/**
	 *
	 */
	host?: string;

	/**
	 * Location where the CLI command point to.
	 */
	targetDirectory?: string;

	/**
	 *
	 */
	repoURL?: string;

	/**
	 *
	 */
	repoSlug?: string;

	/**
	 *
	 */
	code?: string;

	/**
	 *
	 */
	remoteSSH?: string;

	/**
	 *
	 */
	SOCKET_ROOM?: string;

	/**
	 * Framework
	 */
	framework?: Framework;

	/**
	 * Version of the framework
	 */
	frameworkVersion?: string;

	/**
	 * Enable GIT for the application
	 * @default true
	 */
	git?: boolean;

	/**
	 * @default false
	 */
	overwrite?: boolean;

	/**
	 *
	 */
	action?:
		| "new"
		| "init"
		| "auth"
		| "gcloud"
		| "digitalocean"
		| "upgrade"
		| "update"
		| "cdn"
		| "help"
		| "git"
		| "db"
		| "pipeline"
		| "deploy"
		| "build"
		| "analytics"
		| "test-build"
		| "release"
		| "down"
		| "free"
		| string;

	/**
	 *
	 */
	secondAction?: string;

	/**
	 *
	 */
	thirdAction?: string;

	/**
	 *
	 */
	fourAction?: string;

	/**
	 *
	 */
	fifthAction?: string;

	/**
	 * Specify environment code:
	 * - One of: `dev, prod, staging,...`
	 * @default `dev`
	 */
	env?: "dev" | "prod" | "staging" | string;

	/**
	 * @type {Boolean}
	 * @default true
	 */
	isDev?: boolean;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	isStaging?: boolean;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	isProd?: boolean;
	production?: boolean;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	isCanary?: boolean;

	/**
	 * Should compress the files
	 */
	optimize?: boolean;

	/**
	 * @type {Boolean}
	 * @default true
	 */
	ssl?: boolean;

	/**
	 * Should skip creating new directory while creating project
	 * @default false
	 */
	skipCreatingDirectory?: boolean;

	/**
	 * @default false
	 * Should show input options while executing the command [for DEBUGGING]
	 */
	shouldShowInputOptions?: boolean;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	shouldShowHelp?: boolean;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	shouldShowVersion?: boolean;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	shouldUpdateCli?: boolean;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	shouldCompress?: boolean;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	shouldGenerate?: boolean;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	shouldUseTemplate?: boolean;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	shouldMerge?: boolean;

	/**
	 * @type {Boolean}
	 * @default true
	 */
	shouldInherit?: boolean;

	/**
	 *
	 */
	shouldUpdatePipeline?: boolean;

	/**
	 * Should install NPM packages locally after creating new project
	 * @default true
	 */
	shouldInstallPackage?: boolean;

	/**
	 *
	 */
	shouldClose?: boolean;

	/**
	 * Should create something
	 * @example
	 * - Create "imagePullSecrets" in a namespace
	 */
	shouldCreate?: boolean;

	/**
	 *
	 */
	shouldApply?: boolean;

	/**
	 * Content of the deployment yaml (Namespace, Ingress, Service, Deploy,...)
	 */
	deployYaml?: string;

	/**
	 * @type {Number}
	 * @default 3000
	 */
	port?: number;

	/**
	 * @type {Number}
	 */
	replicas?: number;

	/**
	 * Project
	 */
	project?: Project;

	/**
	 * ID of the {Project}
	 * - [WARN] This is NOT a {PROJECT_ID} of Google Cloud platform!
	 */
	projectId?: string;

	/**
	 *
	 */
	projectSlug?: string;

	/**
	 *
	 */
	projectName?: string;

	/**
	 *
	 */
	remoteURL?: string;

	/**
	 *
	 */
	namespace?: string;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	printSuccess?: boolean;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	redirect?: boolean;

	/**
	 *
	 */
	buildDir?: string;

	/**
	 *
	 */
	buildNumber?: string;

	/**
	 *
	 */
	buildImage?: string;

	/**
	 *
	 */
	buildId?: string;

	/**
	 * @default "1x"
	 */
	size?: "none" | "1x" | "2x" | "3x" | "4x" | "5x" | "6x" | "7x" | "8x" | "9x" | "10x";

	/**
	 * Specify an {App} instance
	 */
	app?: App;

	/**
	 * ID of an {App} instance
	 */
	appId?: string;

	/**
	 * Slug of an {App} instance
	 */
	appSlug?: string;

	/**
	 * Cluster's short name. For deploy to specific cluster.
	 */
	cluster?: string;

	/**
	 * [GOOGLE CLOUD] Specify a zone of your cluster
	 */
	zone?: string;

	/**
	 * [GOOGLE CLOUD] Specify a region of your cluster
	 */
	region?: string;

	/**
	 * Cloud provider
	 * @type {"gcloud" | "digitalocean" | "custom"}
	 * @default "custom"
	 */
	provider?: string;

	/**
	 * Git provider
	 * @type {"bitbucket" | "github" | "gitlab"}
	 * @default "custom"
	 */
	gitProvider?: string;

	/**
	 * Specify a git branch
	 */
	gitBranch?: string;

	/**
	 * `PROJECT_ID` trên provider (GCP hoặc DO)
	 */
	providerProject?: string;

	output?: any;

	stagingDomains?: string[];
	prodDomains?: string[];
};

export default InputOptions;
