import chalk from "chalk";
import { log, logWarn } from "diginext-utils/dist/xconsole/log";
import yargs from "yargs";

import pkg from "@/../package.json";
import { type IApp, type IFramework, type IProject } from "@/entities";
import type { InputOptions } from "@/interfaces/InputOptions";
import type { GitProviderType, ResourceQuotaSize } from "@/interfaces/SystemTypes";
import { currentVersion, getLatestCliVersion, shouldNotifyCliUpdate } from "@/plugins";

const cliHeader =
	chalk.bold.underline.green(`Diginext CLI USAGE - VERSION ${pkg.version}`.toUpperCase()) +
	chalk.redBright("\n\n  [TIPS] You can use 'dx' as an alias of 'diginext' command (for faster typing):") +
	chalk.gray("\n\n  # This command:") +
	chalk.yellow("\ndiginext") +
	" --help" +
	chalk.gray("\n  # is equivalent with:") +
	chalk.yellow("\ndx") +
	" --help\n\n---" +
	chalk.gray("\n\n  # also type -h or --help to see the command usage:") +
	chalk.yellow("\ndx [command]") +
	" --help";

const argvOptions = {
	// version: { describe: "Show version number.", alias: "v" },
	debug: { describe: "Show debug logs while executing the command.", alias: "D" },
	tail: { describe: "Follow the output of the command until it's finished" },
	"show-options": { describe: "Show current input options [for debugging].", alias: "s" },
	local: { describe: "For running process on local machine" },
	input: { describe: "Input string", alias: "i" },
	message: { describe: "Input message (for build, deploy or release)", alias: "m" },
	type: { describe: "Input type as string" },
	data: { describe: "Input data", alias: "d" },
	value: { describe: "Input value", alias: "val" },
	file: { describe: "Input file path", alias: "f" },
	key: { describe: "Input key in string", alias: "token" },
	"api-token": { describe: "API access token", alias: "api-key" },
	url: { describe: "Input URL address with http" },
	host: { describe: "Input host address (withou http)" },
	overwrite: { describe: "[DANGER] Force execute a command (skip any errors)", alias: "force" },
	output: { describe: "Output type - default is 'string' (string | yaml | json)", alias: "o" },
	public: { describe: "Git repository access mode (private/public)" },
	merge: { describe: "Force git merge" },
	close: { describe: "Should close or not" },
	create: { describe: "Should create something" },
	"upload-env": { describe: "Should upload local DOTENV to deployed environment" },
	inherit: { describe: "Should inherit from previous deployment or not", alias: "ihr" },
	update: { describe: "Should update CLI before execute a command or not", alias: "U" },
	app: { describe: "Input app name", alias: "a" },
	name: { describe: "Input name" },
	slug: { describe: "Input slug" },
	env: { describe: "Specify deployment environment (in short)" },
	prod: { describe: "Specify production environment", alias: "pro" },
	dev: { describe: "Specify development environment" },
	staging: { describe: "Specify staging environment", alias: "stg" },
	canary: { describe: "Specify canary environment", alias: "cnr" },
	install: { describe: "Should install framework dependencies or not" },
	projectName: { describe: "Specify project name", alias: "project-name" },
	projectSlug: { describe: "Specify project slug", alias: "project-slug" },
	framework: { describe: "Specify framework slug", alias: "fw" },
	targetDir: { describe: "Specify target project directory", alias: "dir" },
	git: { describe: "Specify GIT provider's slug" },
	"git-provider": { describe: "Specify GIT provider type", alias: "gp" },
	"git-org": { describe: "Specify GIT workspace slug", alias: "org" },
	branch: { describe: "Specify GIT branch", alias: "git-branch" },
	provider: { describe: "Specify selected cloud provider", alias: "pro" },
	custom: { describe: "Select a custom provider", alias: "custom" },
	do: { describe: "Select Digital Ocean as a provider", alias: "digitalocean" },
	gcloud: { describe: "Select Google Cloud as a provider", alias: "gcp" },
	cluster: { describe: "Specify selected cluster", alias: "c" },
	registry: { describe: "Specify container registry's slug", alias: "r" },
	project: { describe: "Specify selected project id (for Google Cloud)", alias: "pro" },
	zone: { describe: "Specify selected zone (for Google Cloud)" },
	region: { describe: "Specify selected region (for Google Cloud)" },
	domain: { describe: "Specify primary application's domain" },
	namespace: { describe: "Specify selected namespace inside the cluster", alias: "n" },
	port: { describe: "Specify app listening port / mapping port", alias: "p" },
	image: { describe: "Specify app's image URL on container registry", alias: "img" },
	replicas: { describe: "Specify app scale replicas", alias: "rep" },
	size: { describe: "Assign resource quotas to workload / deploy", alias: "s" },
	ssl: { describe: "Should generate SSL for the deploy or not" },
	ingress: { describe: "Ingress of Kubernetes", alias: "ing" },
	service: { describe: "Service of Kubernetes", alias: "svc" },
	deployment: { describe: "Deployment of Kubernetes", alias: "deploy" },
	compress: { describe: "Should compress static files or not", alias: "zip" },
	redirect: { describe: "Should redirect all alternative domains to the primary or not" },
	generate: { describe: "Should generate config file or not", alias: "G" },
	ci: { describe: "Should enable CI related actions or not" },
	pipeline: { describe: "Should generate Bitbucket pipeline YAML or not" },
	template: { describe: "Should replace current deployment with the templates or not", alias: "tpl" },
	fresh: { describe: "Should do a fresh deploy [WARN - this will wipe out the current namespace]", alias: "fr" },
	rollout: { describe: "Should skip PRE-RELEASE environment and roll out PROD release immediately", alias: "ro" },
	healthz: { describe: "Specify health check path", alias: "hz" },
};

const globalOptions = {
	debug: { ...argvOptions.debug, global: true },
	"show-options": { ...argvOptions["show-options"], global: true },
	local: { ...argvOptions.local, global: true },
	targetDir: argvOptions.targetDir,
	// version: { ...argvOptions.version, global: true },
};

const newProjectOptions = {
	overwrite: argvOptions.overwrite,
	update: argvOptions.update,
	install: argvOptions.install,
	projectName: argvOptions.projectName,
	projectSlug: argvOptions.projectSlug,
	framework: argvOptions.framework,
	targetDir: argvOptions.targetDir,
	namespace: argvOptions.namespace,
	template: argvOptions.template,
	app: argvOptions.app,
	name: argvOptions.name,
	slug: argvOptions.slug,
	public: argvOptions.public,
	"git-org": argvOptions["git-org"],
};

const userInputOptions = {
	input: argvOptions.input,
	key: argvOptions.key,
	token: argvOptions.key,
	"api-token": argvOptions["api-token"],
	"api-key": argvOptions["api-token"],
	file: argvOptions.file,
	url: argvOptions.url,
	host: argvOptions.host,
	output: argvOptions.output,
};

const dotenvOptions = {
	targetDir: argvOptions.targetDir,
	file: argvOptions.file,
	env: argvOptions.env,
	slug: argvOptions.slug,
};

const deployOptions = {
	debug: argvOptions.debug,
	tail: argvOptions.tail,
	targetDir: argvOptions.targetDir,
	overwrite: argvOptions.overwrite,
	projectName: argvOptions.projectName,
	projectSlug: argvOptions.projectSlug,
	app: argvOptions.app,
	name: argvOptions.name,
	slug: argvOptions.slug,
	framework: argvOptions.framework,
	provider: argvOptions.provider,
	cluster: argvOptions.cluster,
	domain: argvOptions.domain,
	namespace: argvOptions.namespace,
	template: argvOptions.template,
	registry: argvOptions.registry,
	zone: argvOptions.zone,
	region: argvOptions.region,
	port: argvOptions.port,
	ssl: argvOptions.ssl,
	size: argvOptions.size,
	redirect: argvOptions.redirect,
	do: argvOptions.do,
	gcloud: argvOptions.gcloud,
	custom: argvOptions.custom,
	create: argvOptions.create,
	shouldUploadDotenv: argvOptions["upload-env"],
	fresh: argvOptions.fresh,
	rollout: argvOptions.rollout,
	message: argvOptions.message,
	healthz: argvOptions.healthz,
};

const kubectlDeploymentOptions = {
	image: argvOptions.image,
	port: argvOptions.port,
	size: argvOptions.size,
};

const kubectlOptions = {
	debug: argvOptions.debug,
	tail: argvOptions.tail,
	targetDir: argvOptions.targetDir,
	overwrite: argvOptions.overwrite,
	cluster: argvOptions.cluster,
	name: argvOptions.name,
	// resources
	namespace: argvOptions.namespace,
	ingress: argvOptions.ingress,
	service: argvOptions.service,
	deployment: argvOptions.deployment,
	// resource > namespace
	// resource > ingress
	// annotations: argvOptions.annotations,
	// resource > service
	type: argvOptions.type,
	// resource > deployment
	...kubectlDeploymentOptions,
	// env: argvOptions["env-vars"],
};

export async function parseCliOptions() {
	// check for new version
	const shouldUpdateCLI = await shouldNotifyCliUpdate();

	if (shouldUpdateCLI) {
		const latestVersion = await getLatestCliVersion();
		logWarn(`-----------------------------------------------------------`);
		logWarn(chalk.yellow(`There is new version of the CLI (${latestVersion}), update with:`));
		logWarn("  dx update");
		logWarn(chalk.gray("  OR"));
		logWarn("  npm update @topgroup/diginext --location=global");
		logWarn(`-----------------------------------------------------------`);
	}

	// start parsing...
	const argv = await yargs(process.argv.slice(2))
		// header
		.usage(cliHeader)
		// .usage("$0 <module> [gcloud|do] <action> - Manage cloud provider accessibility")
		.options(globalOptions)
		// aliases
		.alias("h", "help")
		.alias("v", "version")
		.global(["D", "s", "local", "h"])
		// command: TEST
		.command("test", "", (_yargs) => _yargs.options(argvOptions))
		// command: CLI management
		.command("info", "Show CLI & SERVER information")
		.command("profile", "Show current login user information")
		// command: login
		.command("login", "Authenticate Diginext CLI with BUILD server", (_yargs) =>
			_yargs
				.usage("$0 <server_url> --token=<access_token>")
				.option("url", { ...argvOptions.url, describe: "URL of your Diginext server.", alias: "u" })
				.option("token", { ...argvOptions.key, describe: "Value of User's ACCESS_TOKEN.", alias: "key" })
				.option("api-token", { ...argvOptions.key, describe: "Value of API_ACCESS_TOKEN.", alias: "api-key" })
		)
		.command("logout", "Sign out Diginext CLI from BUILD server")
		.usage("$0 login <build_server_url>", "Login into your build server")
		.usage("$0 login --url=<build_server_url>", "Login into your build server")
		.usage("$0 logout", "Sign out from your build server")
		// command: config
		.command("config", "Show configuration your CLI")
		// command: update
		.command("update", "Update your CLI version")
		.usage("$0 update <version>", "Update your CLI to specific version")
		// command: new
		.command("new", "Create new project & application", newProjectOptions)
		// command: transfer
		.command(["transfer", "tf"], "Tranfer repo from other provider", newProjectOptions)
		// command: snippets
		.command(["snippets", "snpt"], "Generate snippets", newProjectOptions)
		// command: Ask AI
		.command(["ask", "ai"], "Ask AI to generate something.", (_yargs) =>
			_yargs
				.usage(
					chalk.green("Ask AI to generate Dockerfile:\n") +
						`$  $0 ask generate dockerfile \n` +
						`> This will generate a Dockerfile for your project in the current working directory.`
				)
				.command(["generate", "gen"], "Generate something.", (__yargs) => __yargs.command("dockerfile", "Generate Dockerfile"))
				.option("dir", { ...argvOptions.targetDir })
				.option("output", { ...argvOptions.output })
		)
		// command: init
		.command("init", "Initialize CLI in the current project directory")
		// command: logs
		.command(["logs", "log"], "View application's logs")
		// command: upgrade
		.command("upgrade", "Update your project's framework version")
		// command: cdn
		.command("cdn", "Manage cloud storages (CDN)")
		// command: domain
		.command("domain", "Manage your domains", (_yargs) =>
			_yargs
				.usage(
					chalk.green("Create new domain and point it to your server:\n") +
						`$  $0 domain create --name my-example -i 192.168.1.10 \n` +
						`> This will create a domain "my-example.dxup.dev" and point to the IP address: 192.168.1.10`
				)
				.command("create", "> alias: add | new")
				.command("update", "> alias: change | modify | mod")
				.command("delete", "> alias: del")
				.command("list", "> alias: ls")
				.option("name", { ...argvOptions.name })
				.option("input", { ...argvOptions.input })
		)
		// .usage("$0 cdn")
		// command: auth
		.command("auth", "Authenticate with cloud providers", (_yargs) =>
			_yargs
				.usage(
					chalk.green("Authenticate to access your cloud providers:\n") +
						`$  $0 auth --provider gcloud -f ${chalk.cyan("/path/to/service-account.json\n")}` +
						`$  $0 auth --provider do -k ${chalk.cyan("<api_access_token>")}` +
						`$  $0 auth --provider custom -f ${chalk.cyan("/path/to/your-kube-config.yaml")}`
				)
				.options(userInputOptions)
				.demandOption("provider")
		)
		.command("registry", "Manage Container Registry accessibility", (_yargs) =>
			_yargs
				.usage(chalk.green("Manage Container Registry accessibility: "))
				.command("add", "Add/create new container registry", (__yargs) =>
					__yargs
						// input data
						.option("provider", { describe: "Container registry provider" })
						.option("name", { describe: "Container registry name" })
						.option("token", { describe: "DigitalOcean API access token" })
						.option("file", { describe: "Path to Google Service Account JSON file" })
						.option("user", { describe: "Docker username", alias: "u" })
						.option("pass", { describe: "Docker password", alias: "p" })
						.option("server", { describe: "[optional] Docker registry server", alias: "s" })
						.option("email", { describe: "[optional] Docker user's email", alias: "e" })
				)
				.command("connect", "Connect your Docker to the container registry")
				.example("$0 registry connect --provider gcloud", "Connect your Docker/Podman Engine to Google Cloud Container Registry")
				.example("$0 registry connect --provider do", "Connect your Docker/Podman Engine to Digital Ocean Container Registry")
				.example("$0 registry connect --provider dockerhub", "Connect your Docker/Podman Engine to Docker Container Registry")
				.command("secret", 'Get "imagePullSecrets" value')
				.command("allow", 'Create "imagePullSecrets" in the provided namespace of your cluster', (__yargs) =>
					__yargs
						// .alias("create-pull-secret", "")
						// .option("file", { ...userInputOptions.file })
						.option("create", { ...argvOptions.create })
						.option("namepsace", { ...newProjectOptions.namespace })
						.example("$0 registry allow --provider do -n my-namespace --create", 'Create "imagePullSecrets: <name>" in "my-namespace"')
						.example("$0 registry allow --do", 'Create "imagePullSecrets" and output the secret data')
				)
				.example("$0 registry allow --provider gcloud -n my-namespace --create", 'Create "imagePullSecrets: <name>" in "my-namespace"')
				.example("$0 registry allow --gcloud", 'Create "imagePullSecrets" and output the secret data')
		)
		// command: gcloud
		.command("gcloud", "Manage Google Cloud service access", (_yargs) =>
			_yargs.option("file", { ...argvOptions.file }).option("namepsace", { ...newProjectOptions.namespace })
		)
		// command: do
		.command("digitalocean", "Manage Digital Ocean service access", (_yargs) =>
			_yargs
				.option("key", { ...argvOptions.key, describe: "Value of API access key", demandOption: true })
				.option("namepsace", { ...newProjectOptions.namespace })
		)
		// command: custom
		.command("custom", "Manage custom provider service access", (_yargs) =>
			_yargs.option("file", { ...argvOptions.file, demandOption: true }).option("namepsace", { ...newProjectOptions.namespace })
		)
		// command: git
		.command(
			"git",
			"Manage GIT providers",
			(_yargs) =>
				_yargs
					.option("provider", { desc: "Specify your git provider: on of github, gitlab, bitbucket" })
					.command("ssh", "Manage SSH access from your machine with GIT provider")
					.command("login", "Sign in to your GIT provider", (__yargs) => __yargs.boolean("github").boolean("bitbucket"))
					.command("logout", "Log out", (__yargs) => __yargs.boolean("github").boolean("bitbucket"))
					.command("profile", "Show your profile information in JSON", (__yargs) => __yargs.boolean("github").boolean("bitbucket"))
					.command("pullrequest", "Create new pull request", (__yargs) => __yargs.boolean("github").boolean("bitbucket"))
					.command("pr", "-")
					.command("permissions", "Set up branch permissions")
					.command("repos", "Get some most recent repositories")
					.command("repo", "-")
					.usage("$0 ssh register", "Generate public/private keys to register with GIT providers")
					.usage("$0 ssh verify --provider=[github|gitlab|bitbucket]", "Verify your GIT providers accessibility.")
					.usage("$0 pr <destination-branch>", "")
					.example("$0 git login <github|gitlab|bitbucket>", "")
			// .demandCommand(1)
		)
		// command: db
		.command("db", "Manage your databases", (_yargs) =>
			_yargs
				.command("healthz", "Check connection status of a database")
				.command("backup", "Backup a database to local directory", (__yargs) =>
					__yargs.option("targetDir", { desc: "Local backup directory", alias: "dir" })
				)
				.command("restore", "Restore a local backup directory to a database", (__yargs) =>
					__yargs.option("targetDir", { desc: "Local backup directory", alias: "dir" })
				)
				// .command("new", "Create new database")
				// .command("add-default-user", "Add default user to a database")
				// .command("add-user", "Add new user to a database")
				.demandCommand(1)
		)
		// command: cluster
		.command("cluster", "Manage your clusters", (_yargs) =>
			_yargs
				.command("connect", "Connect your machine to the cluster", (__yargs) =>
					__yargs.option("cluster", { describe: "Cluster's slug", alias: "c" })
				)
				.command("get", "Get cluster info")
				.command("set", "Set value to cluster's property")
				.command({
					command: "delete",
					aliases: ["del", "rm"],
					describe: "Delete a cluster",
					handler: (_argv) => {},
				})
				.demandCommand(1)
		)
		// command: kubectl
		.command("kb", "Just kubectl commands with better developer experience", (_yargs) =>
			_yargs
				.command("get", "Get information of a specific K8S resource", (__yargs) =>
					__yargs
						.command("namespace", "Namespace")
						.command("ingress", "Ingress")
						.command("service", "Service")
						.command("deploy", "Deployment")
						.command("secret", "Secret")
				)
				.command("set", "Set information of a specific K8S resource", (__yargs) =>
					__yargs
						// .command("namespace", "Namespace")
						.command("service", "Service")
						.command({
							command: "deployment",
							aliases: ["dep", "deploy"],
							describe: "Deployment",
							builder: (___yargs) =>
								___yargs
									.command("namespace", "Namespace")
									.command("ingress", "Ingress")
									.command("service", "Service")
									.command("deploy", "Deployment")
									.command("secret", "Secret"),
							handler: (_argv) => {
								console.log("key :>> ", _argv.key);
								// _argv.thirdAction = _argv.key;
							},
						})
						.option("secret", { desc: `Name of "imagePullSecret" (create one with: "dx registry allow")`, alias: "key" })
						.option("image", { desc: "", alias: "img" })
				)
				.command("del", "Delete information of a specific K8S resource", kubectlOptions)
				.command({
					command: "delete",
					aliases: ["del", "rm"],
					describe: "Delete specific K8S resources",
					builder: (___yargs) =>
						___yargs
							.command("namespace", "Namespace")
							.command("ingress", "Ingress")
							.command("service", "Service")
							.command("deploy", "Deployment")
							.command("secret", "Secret"),
					handler: (_argv) => {},
				})
		)
		// command: pipeline
		// .command("pipeline", "Run your pipeline workflow")
		// command: dev
		.command("dev", "Start your development environment.", deployOptions)
		// command: build
		.command("build", "Build your project locally.", deployOptions)
		// command: run
		.command("run", "Build your project locally & deploy on the cluster.", deployOptions)
		// command: deploy
		// .command("deploy", "Request BUILD SERVER to build your project & deploy it", deployOptions)
		.command({
			command: "up",
			aliases: ["go", "deploy"],
			describe: "Request BUILD SERVER to build & deploy your app.",
			builder: (_argv) => _argv.option(deployOptions),
			handler: (_argv) => {},
		})
		// command: down
		.command("down", "Take down your deployment", deployOptions)
		// command: dotenv
		.command("dotenv", "Download/upload DOTENV files from/to deploy environment", (_yargs) =>
			_yargs
				.command("upload", "Upload local DOTENV file to a deploy environment.", dotenvOptions)
				.command("download", "Download DOTENV file to local from a deploy environment.", dotenvOptions)
		)
		// command: release
		.command("rollout", "Roll out your PRE-RELEASE deployment", deployOptions)
		// command: analytics
		.command("analytics", "Manage your Google Analytics")
		// command: free
		.command("free", "Free up machine cache files")
		// command: server
		.command("server", "Manage BUILD SERVER", (_yargs) =>
			_yargs
				.command("up", "Start the BUILD SERVER up")
				.command("down", "Stop the BUILD SERVER")
				.command("restart", "Restart the BUILD SERVER")
				.demandCommand(1)
		)
		// command: help
		.command("help", "Show usage documentation")
		// .usage("$0 help")
		.help("help")
		.wrap(yargs.terminalWidth())
		// copyright
		.epilog("Copyright by TOP GROUP VIETNAM © 2023").argv;

	const options: InputOptions = {
		...argv,

		// always attach current version to input options
		version: currentVersion(),

		// actions
		action: argv._[0] as string,
		secondAction: argv._[1] as string,
		thirdAction: argv._[2] as string,
		fourAction: argv._[3] as string,
		fifthAction: argv._[4] as string,

		// inputs
		input: argv.input as string,
		filePath: argv.file as string,
		key: argv.key as string,
		token: argv.key as string,
		apiToken: (argv["api-token"] || argv["api-key"]) as string,
		url: argv.url as string,
		host: argv.host as string,
		name: argv.name as string,
		data: argv.data as string,
		value: argv.value as string,
		user: argv.user as string,
		pass: argv.pass as string,
		email: argv.email as string,
		server: argv.server as string,

		// definitions
		isDebugging: (argv.debug as boolean) ?? false,
		isTail: (argv.tail as boolean) ?? false,
		isLocal: (argv.local as boolean) ?? false,
		overwrite: (argv.overwrite as boolean) ?? false,
		gitProvider: argv["git-provider"] as GitProviderType,
		gitBranch: argv.branch as string,
		gitOrg: argv["git-org"] as string,

		// project & app
		projectName: argv.projectName as string,
		projectSlug: argv.projectSlug as string,
		targetDirectory: argv.targetDir as string,
		isPublic: (argv.public as boolean) ?? false,

		// environment
		env: typeof argv.env === "object" ? argv.env[0] : ((argv.env as string) ?? "dev"),
		envs: typeof argv.env === "object" ? (argv.env as string[]) : [(argv.env as string) ?? "dev"],
		isDev: (argv.dev as boolean) ?? true,
		isStaging: (argv.staging as boolean) ?? argv.env === "staging" ?? false,
		isCanary: (argv.canary as boolean) ?? argv.env === "canary" ?? false,
		isProd: (argv.prod as boolean) ?? argv.env === "prod" ?? false,

		// helper
		ci: (argv.ci as boolean) ?? false,
		shouldShowInputOptions: (argv["show-options"] as boolean) ?? false,
		shouldInstallPackage: (argv.install as boolean) ?? true,
		shouldShowHelp: (argv.help as boolean) ?? false,
		shouldShowVersion: (argv.version as boolean) ?? true,
		shouldUpdateCli: (argv.update as boolean) ?? false,
		shouldCompress: (argv.compress as boolean) ?? false,
		shouldGenerate: (argv.generate as boolean) ?? false,
		shouldUseTemplate: (argv.template as boolean) ?? false,
		shouldUpdatePipeline: (argv.pipeline as boolean) ?? false,
		shouldMerge: (argv.merge as boolean) ?? false,
		shouldClose: (argv.close as boolean) ?? false,
		shouldInherit: (argv.inherit as boolean) ?? true,
		shouldUploadDotenv: argv["upload-env"] as boolean,
		shouldUseFreshDeploy: argv.fresh as boolean,
		shouldRollOut: argv.rollout as boolean,
		shouldCreate: (argv.create as boolean) ?? false,

		// deployment
		app: argv.app as IApp,
		domain: argv.domain as string,
		port: argv.port as number,
		replicas: argv.replicas as number,
		size: argv.size as ResourceQuotaSize | undefined,
		provider: argv.provider as string,
		registry: argv.registry as string,
		cluster: argv.cluster as string,
		zone: argv.zone as string,
		project: argv.project as IProject,
		namespace: argv.namespace as string,
		redirect: argv.redirect as boolean,
		ssl: argv.ssl as boolean, // [FLAG] --no-ssl
		// [FLAG] --no-healthz, --healthz=/custom/path
		healthz: argv.healthz === true ? "/" : argv.healthz === false || argv.healthz === undefined ? null : (argv.healthz as string),
		imageURL: argv.image as string,
		message: argv.message as string,
	};

	const { DB } = await import("@/modules/api/DB");

	if (typeof argv.git !== "undefined") {
		options.git = await DB.findOne("git", { slug: argv.git }, { ignorable: true, isDebugging: options.isDebugging });
		if (!options.git) throw new Error(`Git provider "${argv.git}" not found.`);
	}

	if (typeof argv.framework !== "undefined") {
		if (argv.framework === "none") {
			options.framework = { name: "None/unknown", slug: "none", isPrivate: false } as IFramework;
		} else {
			options.framework = await DB.findOne("framework", { slug: argv.framework }, { ignorable: true, isDebugging: options.isDebugging });
			if (!options.framework) throw new Error(`Framework "${argv.framework}" not found.`);
			options.frameworkVersion = options.framework.mainBranch || "main";
		}
	}

	if (argv.github === true && typeof options.gitProvider === "undefined") options.gitProvider = "github";
	if (argv.bitbucket === true && typeof options.gitProvider === "undefined") options.gitProvider = "bitbucket";

	if (argv.do === true) options.provider = "digitalocean";
	if (argv.gcloud === true) options.provider = "gcloud";
	if (argv.custom === true) options.provider = "custom";

	if (options.isProd) {
		options.env = "prod";
		options.isDev = false;
	}

	if (options.isStaging) {
		options.env = "staging";
		options.isDev = options.isProd = false;
	}

	if (options.isCanary) {
		options.env = "canary";
		options.isDev = options.isProd = false;
	}

	if (options.shouldShowInputOptions) log(options);
	// console.log("options :>> ", options);
	return options;
}

// TEST: pnpm ts-node src/modules/cli/parseCliOptions.ts [...options]
// parseCliOptions();
