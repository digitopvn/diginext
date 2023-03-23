#! /usr/bin/env node

import chalk from "chalk";
import Configstore from "configstore";
import { log, logWarn } from "diginext-utils/dist/console/log";
import execa from "execa";
import yargs from "yargs";

import pkg from "@/../package.json";
import { execConfig, getCliConfig } from "@/config/config";
import type { InputOptions } from "@/interfaces/InputOptions";
import { execAnalytics } from "@/modules/analytics";
import createApp from "@/modules/apps/new-app";
import { startBuildV1 } from "@/modules/build/start-build";
import { execCDN } from "@/modules/cdn";
import { cliAuthenticate, cliLogin, cliLogout, parseCliOptions } from "@/modules/cli";
import { execDatabase } from "@/modules/db";
import * as deploy from "@/modules/deploy";
import { execDomain } from "@/modules/domains/execDomain";
import { execGit, generateSSH } from "@/modules/git";
import { execPipeline } from "@/modules/pipeline";
import CustomProvider, { execCustomProvider } from "@/modules/providers/custom";
import DigitalOcean, { execDigitalOcean } from "@/modules/providers/digitalocean";
import GCloud, { execGoogleCloud } from "@/modules/providers/gcloud";
import { execRegistry } from "@/modules/registry";
import { execServer } from "@/modules/server";
import { currentVersion, freeUp, getOS } from "@/plugins";

import { CLI_CONFIG_FILE, CLI_DIR } from "./config/const";
import { execInitApp } from "./modules/apps/init-app";
import { startBuildAndRun } from "./modules/build/start-build-and-run";
import { updateCli } from "./modules/cli/update-cli";
import { execCluster } from "./modules/cluster/cli-cluster";
import { execDotenvCommand } from "./modules/deploy/dotenv-exec";
import { execRollOut } from "./modules/deploy/exec-rollout";
import { parseOptionsToAppConfig } from "./modules/deploy/parse-options-to-app-config";
import { requestDeploy } from "./modules/deploy/request-deploy";
import { requestDeployImage } from "./modules/deploy/request-deploy-image";
import { execKubectl } from "./modules/k8s/kubectl-cli";
import { showServerInfo } from "./modules/server/server-info";

/**
 * Initialize CONFIG STORE (in document directory of the local machine)
 */
export const conf = new Configstore(pkg.name);

export async function processCLI(options?: InputOptions) {
	options.version = currentVersion();

	const { buildServerUrl } = getCliConfig();

	if (options.isDebugging) {
		log(chalk.cyan("---------------- DEBUG ----------------"));
		log(`• OS:		`, getOS().toUpperCase());
		log("• Node:		", (await execa("node", ["-v"])).stdout);
		log("• NPM:			", (await execa("npm", ["-v"])).stdout);
		log("• Docker:		", (await execa("docker", ["-v"])).stdout);
		log("• Mode:		", process.env.CLI_MODE || "client");
		log("• CLI Version:	", options.version);
		log("• CLI Dir:	", CLI_DIR);
		log("• CLI Config:	", CLI_CONFIG_FILE);
		log("• Working dir:	", process.cwd());
		log("• Server URL:	", buildServerUrl);
		log(chalk.cyan("---------------------------------------"));
	}

	let env = "dev";
	if (options.isStaging) env = "staging";
	if (options.isProd) env = "prod";
	if (options.env) env = options.env;

	switch (options.action) {
		case "info":
			await showServerInfo(options);
			break;

		case "login":
			await cliLogin(options);
			break;

		case "logout":
			await cliLogout();
			break;

		case "server":
			await cliAuthenticate(options);
			await generateSSH(); // make sure we got the PUBLIC KEY and PRIVATE KEY for SSH setup later on
			await execServer(options);
			return;

		case "config":
			await cliAuthenticate(options);
			await execConfig(options);
			break;

		case "update":
			await updateCli();
			break;

		case "new":
			await cliAuthenticate(options);
			await createApp(options);
			break;

		case "init":
			await cliAuthenticate(options);
			await execInitApp(options);
			break;

		case "upgrade":
			// await promptForAuthOptions(options);
			// await authenticateBitbucket(options);
			// await parseOptions(options);
			// await upgradeFramework(options);
			// break;
			return logWarn(`This command is deprecated.`);

		case "cdn":
			await cliAuthenticate(options);
			await execCDN(options);
			break;

		case "auth":
			await cliAuthenticate(options);
			switch (options.provider) {
				case "custom":
					await CustomProvider.authenticate(options);
					return;
				case "digitalocean":
					await DigitalOcean.authenticate(options);
					return;
				case "gcloud":
					await GCloud.authenticate(options);
					return;
				default:
					await log(`What's up, mate?`);
					return;
			}

		case "registry":
			await cliAuthenticate(options);
			await execRegistry(options);
			return;

		case "domain":
			await cliAuthenticate(options);
			await execDomain(options);
			return;

		case "gcloud":
			await cliAuthenticate(options);
			options.provider = "gcloud";
			await execGoogleCloud(options);
			return;

		case "digitalocean":
			await cliAuthenticate(options);
			options.provider = "digitalocean";
			await execDigitalOcean(options);
			return;

		case "custom":
			await cliAuthenticate(options);
			options.provider = "custom";
			await execCustomProvider(options);
			return;

		case "git":
			await cliAuthenticate(options);
			await execGit(options);
			return;

		case "cluster":
			await cliAuthenticate(options);
			await execCluster(options);
			return;

		case "db":
			await cliAuthenticate(options);
			await execDatabase(options, env);
			return;

		case "pipeline":
			await cliAuthenticate(options);
			await execPipeline(options);
			return;

		case "kb":
			await cliAuthenticate(options);
			await execKubectl(options);
			return;

		case "build":
			await cliAuthenticate(options);
			options.isLocal = true;
			await parseOptionsToAppConfig(options);
			await startBuildV1(options, { shouldRollout: false });
			return;

		case "run":
			await cliAuthenticate(options);
			options.isLocal = true;
			await parseOptionsToAppConfig(options);
			await startBuildAndRun(options);
			return;

		case "dotenv":
			await cliAuthenticate(options);
			await execDotenvCommand(options);
			return;

		case "deploy":
			await cliAuthenticate(options);
			if (options.secondAction) {
				// deploy from image url
				await requestDeployImage(options.secondAction, options);
			} else {
				// deploy from source
				await requestDeploy(options);
			}
			return;

		case "rollout":
			await cliAuthenticate(options);
			await execRollOut(options);
			return;

		case "down":
			await cliAuthenticate(options);
			await deploy.execTakeDown(options);
			return;

		case "analytics":
			await cliAuthenticate(options);
			await execAnalytics(options);
			return;

		case "free":
			await cliAuthenticate(options);
			await freeUp();
			return;

		default:
			yargs.showHelp();
			break;
	}
}

if (process.env.CLI_MODE == "server") {
	import("@/server");
} else {
	// Execute CLI commands...
	parseCliOptions().then((inputOptions) => {
		processCLI(inputOptions).then(() => process.exit(0));
	});
}
