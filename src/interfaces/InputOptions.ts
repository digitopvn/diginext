import type { IApp, IFramework, IGitProvider, IProject, IWorkspace } from "@/entities";

import type { GitProviderType, ResourceQuotaSize } from "./SystemTypes";

/**
 * Các giá trị đầu vào của CLI
 */
export type InputOptions = {
	/**
	 * For testing purpose
	 */
	isDebugging?: boolean;

	/**
	 * Follow the output logs until the command is finished.
	 */
	isTail?: boolean;

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
	 * Continuous integration (CI) flag
	 * - Flag: `--ci`
	 * - Revert: `--no-ci`
	 * @default false
	 */
	ci?: boolean;

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
	workspace?: IWorkspace;
	workspaceId?: string;

	/**
	 * User input organization. Used in:
	 * - Container registry authentication
	 */
	org?: string;

	/**
	 * User input username
	 */
	user?: string;

	/**
	 * User input password
	 */
	pass?: string;

	/**
	 * User input email
	 */
	email?: string;

	/**
	 * User input server
	 */
	server?: string;

	/**
	 * Auth input name
	 */
	auth?: string;

	/**
	 * User input name
	 */
	name?: string;

	/**
	 * {App} slug
	 */
	slug?: string;

	/**
	 * Flag: `--token`
	 */
	token?: string;

	/**
	 *
	 */
	refreshToken?: string;

	/**
	 * Flag: `-i`, `--input`
	 */
	input?: string;

	/**
	 *
	 */
	data?: string;
	/**
	 * Flag: `--key`, `--token`
	 */
	key?: string;
	/**
	 * Flag: `--val`, `--value`
	 */
	value?: string;

	/**
	 * Flag: `-f`, `--file`
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
	 * Git repo URL
	 * @example https://github.com/digitopvn/diginext
	 */
	repoURL?: string;

	/**
	 * Git repo SSH url
	 * @example git@github.com:digitopvn/diginext.git
	 */
	repoSSH?: string;

	/**
	 * Git repo slug
	 */
	repoSlug?: string;

	/**
	 *
	 */
	SOCKET_ROOM?: string;

	/**
	 * Framework
	 */
	framework?: IFramework;

	/**
	 * Version of the framework
	 */
	frameworkVersion?: string;

	/**
	 * @default false
	 */
	overwrite?: boolean;

	/**
	 * DX command's action level 1
	 */
	action?: string;

	/**
	 * DX command's action level 2
	 */
	secondAction?: string;

	/**
	 * DX command's action level 3
	 */
	thirdAction?: string;

	/**
	 * DX command's action level 4
	 */
	fourAction?: string;

	/**
	 * DX command's action level 5
	 */
	fifthAction?: string;

	/**
	 * Specify environment code:
	 * - One of: `dev, prod, staging,...`
	 * @default "dev"
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
	 * Should update CLI version before running the command
	 * @type {Boolean}
	 * @default false
	 */
	shouldUpdateCli?: boolean;

	/**
	 * @deprecated
	 * ### This is required now!
	 * ---
	 * Enable GIT when create new or initialize app
	 * @default true
	 */
	shouldUseGit?: boolean;

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
	 * @deprecated
	 */
	shouldUpdatePipeline?: boolean;

	/**
	 * Should install NPM packages locally after creating new project
	 * @default true
	 */
	shouldInstallPackage?: boolean;

	/**
	 * @default true
	 */
	shouldClose?: boolean;

	/**
	 * [Use when deploying an app] Force upload local DOTENV file to deployed environment.
	 * @default false
	 */
	shouldUploadDotenv?: boolean;

	/**
	 * [Use when deploying an app] Should enable CDN for this app
	 * @default false
	 */
	shouldEnableCDN?: boolean;

	/**
	 * Should create something
	 * @example
	 * - Create "imagePullSecrets" in a namespace
	 * @default false
	 */
	shouldCreate?: boolean;

	/**
	 * Should apply something
	 */
	shouldApply?: boolean;

	/**
	 * ! Should deploy app from a fresh namespace
	 * ## [WARNING]
	 * - **With this flag enabled, the server will wipe out all current deployments within the target namespace, then deploy your app completely from scratch!**
	 * - Use at your own risk, make sure you understand what you're doing, double check the namespace before deploying to avoid accidently take down other apps.
	 */
	shouldUseFreshDeploy?: boolean;

	/**
	 * Content of the deployment yaml (Namespace, Ingress, Service, Deploy,...)
	 */
	deployYaml?: string;

	/**
	 * @type {Number}
	 */
	port?: number;

	/**
	 * @type {Number}
	 */
	replicas?: number;

	/**
	 * Project
	 */
	project?: IProject;

	/**
	 * ID of the {Project}
	 * - [WARN] This is NOT a {PROJECT_ID} of Google Cloud platform!
	 */
	projectId?: string;

	/**
	 * {Project} slug
	 */
	projectSlug?: string;

	/**
	 * {Project} name
	 */
	projectName?: string;

	/**
	 * Kubernetes namespace
	 */
	namespace?: string;

	/**
	 * Application's domain
	 * @example "myapp.example.com"
	 */
	domain?: string;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	printSuccess?: boolean;

	/**
	 * Git repository access policy, default is PRIVATE.
	 * @type {Boolean}
	 * @default false
	 */
	isPublic?: boolean;

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
	imageURL?: string;

	/**
	 *
	 */
	buildId?: string;

	/**
	 * @default "1x"
	 */
	size?: ResourceQuotaSize;

	/**
	 * Specify an {App} instance
	 */
	app?: IApp;

	/**
	 * ID of an {App} instance
	 */
	appId?: string;

	/**
	 * Slug of an {App} instance
	 */
	appSlug?: string;

	/**
	 * Cluster's slug. For deploy to specific cluster.
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
	 * - Flag: `--provider`, `--pro`
	 * @type {"gcloud" | "digitalocean" | "custom"}
	 * @default "custom"
	 */
	provider?: string;

	/**
	 * Container Registry's slug
	 * - Flag: `-r`, `--registry`
	 */
	registry?: string;

	/**
	 * Git provider
	 * - Flag: `--git`
	 */
	git?: IGitProvider;

	/**
	 * Git provider type
	 * - Flag: `--gp`, `--git-provider`
	 */
	gitProvider?: GitProviderType;

	/**
	 * A slug of git workspace
	 * - Flag: `--org`, `--git-org`
	 */
	gitOrg?: string;

	/**
	 * Specify a git branch
	 */
	gitBranch?: string;

	/**
	 * `PROJECT_ID` trên provider (GCP hoặc DO)
	 */
	providerProject?: string;

	/**
	 * Flag: `-o`, `--output`
	 * @default "string"
	 * @example "string" | "json" | "yaml"
	 */
	output?: string;

	/**
	 * Output directory location.
	 * @default "string"
	 * @example "/path/to/output/"
	 */
	outputDir?: any;

	/**
	 * Output file name.
	 * @default "string"
	 * @example "output.txt"
	 */
	outputName?: any;

	/**
	 * Output path (include directory path + file name).
	 * @default "string"
	 * @example "/path/to/output.file"
	 */
	outputPath?: any;

	/**
	 * @deprecated
	 */
	stagingDomains?: string[];
	/**
	 * @deprecated
	 */
	prodDomains?: string[];
};

export default InputOptions;
