import type { IApp, IFramework, IGitProvider, IProject, IUser, IWorkspace } from "@/entities";

import type { GitProviderType, ResourceQuotaSize } from "./SystemTypes";

/**
 * Các giá trị đầu vào của CLI
 */
export type InputOptions = {
	/**
	 * For testing purpose
	 * - Flags: `--debug`
	 */
	isDebugging?: boolean;

	/**
	 * Follow the output logs until the command is finished.
	 * - Flags: `--tail`
	 */
	isTail?: boolean;

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
	 * - Flag: `--ci`, `--no-ci`
	 * @default false
	 */
	ci?: boolean;

	/**
	 * Define if the command was executed on local machine or server machine
	 * - Flags: `--local`
	 */
	isLocal?: boolean;

	/**
	 * Version string
	 * - Flags: `--version`, `-v`
	 */
	version?: string;

	/**
	 * Ownership
	 */
	author?: IUser;
	username?: string;
	userId?: string;
	workspace?: IWorkspace;
	workspaceId?: string;

	/**
	 * User input organization. Used in:
	 * - Container registry commands
	 * - Git provider commands
	 */
	org?: string;

	/**
	 * User input username
	 * - Flags: `--user`
	 */
	user?: string;

	/**
	 * User input password
	 * - Flags: `--pass`
	 */
	pass?: string;

	/**
	 * User input email
	 * - Flags: `--email`
	 */
	email?: string;

	/**
	 * User input server
	 * - Flags: `--server`
	 */
	server?: string;

	/**
	 * Auth input name
	 * - Flags: `--auth`
	 */
	auth?: string;

	/**
	 * User input name
	 * - Flags: `--name`
	 */
	name?: string;

	/**
	 * {App} slug
	 * - Flags: `--slug`
	 */
	slug?: string;

	/**
	 * Flag: `-i`, `--input`
	 */
	input?: string;

	/**
	 *
	 */
	data?: string;

	/**
	 * User access token
	 * Flag: `--token`
	 */
	token?: string;

	/**
	 * User refresh token
	 */
	refreshToken?: string;

	/**
	 * API access token
	 * - Flag: `--api-key`, `--api-token`
	 */
	apiToken?: string;

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
	 * - Flags: `--path`
	 *
	 */
	path?: string;

	/**
	 * - Flags: `--url`
	 *
	 */
	url?: string;

	/**
	 * - Flags: `--host`
	 *
	 */
	host?: string;

	/**
	 * Location where the CLI command point to.
	 * - Flags: `--dir`, `--targetDir`
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
	 * - Flags: `--force`, `--overwrite`
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
	 * - Flags: `--env`
	 * @default "dev"
	 */
	env?: "dev" | "prod" | "staging" | string;

	/**
	 * - Flags: `--dev`
	 * @type {Boolean}
	 * @default true
	 */
	isDev?: boolean;

	/**
	 * - Flags: `--staging`
	 * @type {Boolean}
	 * @default false
	 */
	isStaging?: boolean;

	/**
	 * - Flags: `--prod`
	 * @type {Boolean}
	 * @default false
	 */
	isProd?: boolean;
	production?: boolean;

	/**
	 * - Flags: `--canary`
	 * @type {Boolean}
	 * @default false
	 */
	isCanary?: boolean;

	/**
	 * Should compress the files
	 */
	optimize?: boolean;

	/**
	 * - Flags: `--ssl`, `--no-ssl`
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
	 * - Flags: `--help`, `-h`
	 * @type {Boolean}
	 * @default false
	 */
	shouldShowHelp?: boolean;

	/**
	 * - Flags: `--version`, `-v`
	 * @type {Boolean}
	 * @default false
	 */
	shouldShowVersion?: boolean;

	/**
	 * - Flags: `--update`, `-U`
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
	 * - Flags: `--template`
	 * @type {Boolean}
	 * @default false
	 */
	shouldUseTemplate?: boolean;

	/**
	 * - Flags: `--merge`
	 * @type {Boolean}
	 * @default false
	 */
	shouldMerge?: boolean;

	/**
	 * - Flags: `--inherit`
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
	 * - Flags: `--close`
	 * @default true
	 */
	shouldClose?: boolean;

	/**
	 * [Use when deploying an app] Force upload local DOTENV file to deployed environment.
	 * - Flags: `--upload-env`
	 * @default false
	 */
	shouldUploadDotenv?: boolean;

	/**
	 * [Use when deploying an app] Should enable CDN for this app
	 * - Flags: `--cdn`
	 * @default false
	 */
	shouldEnableCDN?: boolean;

	/**
	 * Should create something
	 * - Flags: `--create`
	 * @example
	 * - Create "imagePullSecrets" in a namespace
	 * @default false
	 */
	shouldCreate?: boolean;

	/**
	 * Should apply something
	 * - Flags: `--apply`
	 */
	shouldApply?: boolean;

	/**
	 * Should roll out release (skip `prerelease` environment)
	 * - Flags: `--rollout`
	 * @default false
	 */
	shouldRollOut?: boolean;

	/**
	 * ! Should deploy app from a fresh namespace
	 * - Flags: `--fresh`
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
	 * - Flags: `--port`
	 * @type {Number}
	 */
	port?: number;

	/**
	 * - Flags: `--replicas`
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
	 * - Flags: `--projectSlug`
	 */
	projectSlug?: string;

	/**
	 * {Project} name
	 * - Flags: `--projectName`
	 */
	projectName?: string;

	/**
	 * Kubernetes namespace
	 * - Flags: `--namespace`
	 */
	namespace?: string;

	/**
	 * Application's domain
	 * - Flags: `--domain`
	 * @example "myapp.example.com"
	 */
	domain?: boolean | string;

	/**
	 * @type {Boolean}
	 * @default false
	 */
	printSuccess?: boolean;

	/**
	 * Git repository access policy, default is PRIVATE.
	 * - Flags: `--public`
	 *
	 * @type {Boolean}
	 * @default false
	 */
	isPublic?: boolean;

	/**
	 * - Flags: `--redirect`
	 *
	 * @type {Boolean}
	 * @default false
	 */
	redirect?: boolean;

	/**
	 * Build directory
	 */
	buildDir?: string;

	/**
	 * Build tag
	 */
	buildTag?: string;

	/**
	 * Build image
	 */
	buildImage?: string;

	/**
	 * - Flags: `--image`
	 */
	imageURL?: string;

	/**
	 *
	 */
	buildId?: string;

	/**
	 * - Flags: `--size`
	 *
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
	 * - Flags: `--appSlug`
	 */
	appSlug?: string;

	/**
	 * Cluster's slug. For deploy to specific cluster.
	 * - Flags: `--cluster`
	 */
	cluster?: string | boolean;

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
	registry?: string | boolean;

	/**
	 * Git provider
	 * - Flag: `--git`
	 */
	git?: IGitProvider;

	/**
	 * Git provider type
	 * - Flag: `--gp`, `--git-provider`
	 * @example "github", "bitbucket"
	 */
	gitProvider?: GitProviderType;

	/**
	 * A slug of git workspace
	 * - Flag: `--org`, `--git-org`
	 */
	gitOrg?: string;

	/**
	 * Specify a git branch
	 * - Flags: `--branch`, `--git-branch`
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
