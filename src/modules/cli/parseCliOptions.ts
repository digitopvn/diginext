import chalk from "chalk";
import { log, logWarn } from "diginext-utils/dist/console/log";
import yargs from "yargs";

import pkg from "@/../package.json";
import type { InputOptions } from "@/interfaces/InputOptions";
import { checkForUpdate, currentVersion, getLatestCliVersion } from "@/plugins";

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
	local: { describe: "[TEST] For testing CLI & BUILD SERVER on local machine" },
	input: { describe: "Input string", alias: "i" },
	data: { describe: "Input data", alias: "d" },
	value: { describe: "Input value" },
	file: { describe: "Input file path", alias: "f" },
	key: { describe: "Input key in string", alias: "k" },
	url: { describe: "Input URL address with http" },
	host: { describe: "Input host address (withou http)" },
	overwrite: { describe: "[DANGER] Force execute a command (skip any errors)", alias: "force" },
	output: { describe: "Output type (yaml | json)", alias: "o" },
	git: { describe: "Create new remote repository or not" },
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
	framework: { describe: "Specify framework", alias: "fw" },
	targetDir: { describe: "Specify target project directory", alias: "dir" },
	"git-provider": { describe: "Specify GIT provider", alias: "gp" },
	provider: { describe: "Specify selected cloud provider", alias: "cp" },
	custom: { describe: "Select a custom provider", alias: "custom" },
	do: { describe: "Select Digital Ocean as a provider", alias: "digitalocean" },
	gcloud: { describe: "Select Google Cloud as a provider", alias: "gcp" },
	cluster: { describe: "Specify selected cluster" },
	registry: { describe: "Specify selected container registry" },
	project: { describe: "Specify selected project id (for Google Cloud)", alias: "pro" },
	zone: { describe: "Specify selected zone (for Google Cloud)" },
	region: { describe: "Specify selected region (for Google Cloud)" },
	namespace: { describe: "Specify selected namespace inside the cluster", alias: "n" },
	port: { describe: "Specify app listening port / mapping port", alias: "p" },
	replicas: { describe: "Specify app scale replicas", alias: "rep" },
	size: { describe: "Assign resource quotas to workload / deploy", alias: "s" },
	ssl: { describe: "Should generate SSL for the deploy or not" },
	compress: { describe: "Should compress static files or not", alias: "zip" },
	redirect: { describe: "Should redirect all alternative domains to the primary or not" },
	generate: { describe: "Should generate config file or not", alias: "G" },
	pipeline: { describe: "Should generate Bitbucket pipeline YAML or not" },
	template: { describe: "Should replace current deployment with the templates or not", alias: "tpl" },
};

const globalOptions = {
	debug: { ...argvOptions.debug, global: true },
	"show-options": { ...argvOptions["show-options"], global: true },
	local: { ...argvOptions.local, global: true },
	// version: { ...argvOptions.version, global: true },
};

const newProjectOptions = {
	overwrite: argvOptions.overwrite,
	git: argvOptions.git,
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
};

const userInputOptions = {
	input: argvOptions.input,
	key: argvOptions.key,
	file: argvOptions.file,
	url: argvOptions.url,
	host: argvOptions.host,
	output: argvOptions.output,
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
};

export async function parseCliOptions() {
	// check for new version
	const shouldUpdateCLI = await checkForUpdate();
	if (shouldUpdateCLI) {
		const latestVersion = await getLatestCliVersion();
		logWarn(chalk.yellow(`There is new version of the CLI (${latestVersion}), update with:`));
		logWarn("  dx update");
		logWarn(chalk.gray("  OR"));
		logWarn("  npm update @topgroup/diginext --global");
	}

	// start parsing...
	const argv: any = yargs(process.argv.slice(2))
		// header
		.usage(cliHeader)
		// .usage("$0 <module> [gcloud|do] <action> - Manage cloud provider accessibility")
		.options(globalOptions)
		// aliases
		// .alias("target-dir", "--targetDir")
		.alias("h", "help")
		.alias("v", "version")
		.global(["D", "s", "local", "h"])
		// command: CLI management
		// command: login
		.command("login", "Authenticate Diginext CLI with BUILD server")
		.command("logout", "Sign out Diginext CLI from BUILD server")
		.usage("$0 login <build_server_url>", "Login into your build server")
		.usage("$0 login --url=<build_server_url>", "Login into your build server")
		.usage("$0 logout", "Sign out from your build server")
		// command: config
		.command("config", "Configurate your CLI", (_yargs) =>
			_yargs
				.command("get", "Get current CLI configuration")
				.command("provider", "View/add/remove cloud provider")
				.command("cluster", "View/add/remove kubernetes cluster")
				.demandCommand(1)
		)
		// command: update
		.command("update", "Update your CLI version")
		.usage("$0 update", "Update your CLI to latest version")
		.usage("$0 update <version>", "Update your CLI to specific version")
		// command: new
		.command("new", "Create new project & application", newProjectOptions)
		// .usage("$0 new", "Create new project")
		// .usage("$0 new --force", "[DANGER] Force create new project & overwrite if it's existed")
		// .usage("$0 new --fw <framework>", "Create new project with specific framework")
		// .usage("$0 new --install", "Create new project then install all dependencies")
		// command: init
		.command("init", "Initialize CLI in the current project directory")
		// .usage("$0 init")
		// command: upgrade
		.command("upgrade", "Update your project's framework version")
		// .usage("$0 upgrade")
		// command: cdn
		.command("cdn", "Manage cloud storages (CDN)")
		// command: domain
		.command("domain", "Manage your domains", (_yargs) =>
			_yargs
				.usage(
					chalk.green("Create new domain and point it to your server:\n") +
						`$  $0 domain create --name my-example -i 192.168.1.10 \n` +
						`> This will create a domain "my-example.diginext.site" and point to the IP address: 192.168.1.10`
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
				.example("$0 registry connect --provider gcloud", "Connect your Docker to Google Cloud Container Registry")
				.example("$0 registry connect --provider do", "Connect your Docker to Digital Ocean Container Registry")
				.command("connect", "Connect your Docker to the container registry")
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
					.command("login", "Sign in to your GIT provider")
					.command("logout", "Log out")
					.command("profile", "Show your profile information in JSON")
					.command("pullrequest", "Create new pull request")
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
				.command("new", "Create new database")
				.command("add-default-user", "Add default user to a database")
				.command("add-user", "Add new user to a database")
				.demandCommand(1)
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
		.command("deploy", "Request BUILD SERVER to build your project & deploy it", deployOptions)
		// command: release
		// .command("release", "Roll out your PRE-RELEASE deployment", deployOptions)
		.command("rollout", "Roll out your PRE-RELEASE deployment", deployOptions)
		// command: down
		.command("down", "Take down your deployment project", deployOptions)
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
		// .usage("$0 server")
		// command: help
		.command("help", "Show usage documentation")
		// .usage("$0 help")
		.help("help")
		.wrap(yargs.terminalWidth())
		// copyright
		.epilog("Copyright by DIGITOP © 2022").argv;

	// log(`argv >>`, argv);

	const options: InputOptions = {
		// always attach current version to input options
		version: currentVersion(),

		// actions
		action: argv._[0],
		secondAction: argv._[1],
		thirdAction: argv._[2],
		fourAction: argv._[3],
		fifthAction: argv._[4],

		// inputs
		input: argv.input,
		filePath: argv.file,
		key: argv.key,
		url: argv.url,
		host: argv.host,
		name: argv.name,
		data: argv.data,
		value: argv.value,

		// definitions
		isDebugging: argv.debug ?? false,
		isTail: argv.tail ?? false,
		isLocal: argv.local ?? false,
		overwrite: argv.overwrite ?? false,
		shouldUseGit: argv.git ?? true,
		gitProvider: argv["git-provider"],

		// project
		projectName: argv.projectName,
		projectSlug: argv.projectSlug,
		targetDirectory: argv.targetDir,
		framework: argv.framework,

		// environment
		env: argv.env ?? "dev",
		isDev: argv.dev ?? true,
		isStaging: argv.staging ?? argv.env == "staging" ?? false,
		isCanary: argv.canary ?? argv.env == "canary" ?? false,
		isProd: argv.prod ?? argv.env == "prod" ?? false,

		// helper
		shouldShowInputOptions: argv["show-options"] ?? false,
		shouldInstallPackage: argv.install ?? true,
		shouldShowHelp: argv.help ?? false,
		shouldShowVersion: argv.version ?? true,
		shouldUpdateCli: argv.update ?? false,
		shouldCompress: argv.compress ?? false,
		shouldGenerate: argv.generate ?? false,
		shouldUseTemplate: argv.template ?? false,
		shouldUpdatePipeline: argv.pipeline ?? false,
		shouldMerge: argv.merge ?? false,
		shouldClose: argv.close ?? false,
		shouldInherit: argv.inherit ?? true,
		shouldUploadDotenv: argv["upload-env"],

		// deployment
		app: argv.app, // monorepo app's name
		port: argv.port,
		replicas: argv.replicas,
		size: argv.size ?? "none",
		provider: argv.provider,
		cluster: argv.cluster,
		zone: argv.zone,
		project: argv.project,
		namespace: argv.namespace,
		redirect: argv.redirect,
		ssl: argv.ssl, // [FLAG] --no-ssl
	};

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

	return options;
}

// TEST: yarn ts-node src/modules/cli/parseCliOptions.ts [...options]
// parseCliOptions();
