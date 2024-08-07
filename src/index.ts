#! /usr/bin/env node

// import Configstore from "configstore";
import { log, logError, logWarn } from "diginext-utils/dist/xconsole/log";
import yargs from "yargs";

import { execConfig } from "@/config/config";
import type { InputOptions } from "@/interfaces/InputOptions";
import { execAnalytics } from "@/modules/analytics";
import createApp from "@/modules/apps/new-app";
import transferRepo from "@/modules/apps/transferRepo";
import { execCDN } from "@/modules/cdn";
import { cliAuthenticate, cliLogin, cliLogout, parseCliOptions, showProfile } from "@/modules/cli";
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
import generateSnippet from "@/modules/snippets/generateSnippet";
import { currentVersion } from "@/plugins";

import { execAI } from "./modules/ai/exec-ai";
import { execInitApp } from "./modules/apps/init-app";
import { viewAppLogs } from "./modules/apps/view-logs";
import { requestBuild } from "./modules/build/request-build";
import { startBuildAndRun } from "./modules/build/start-build-and-run";
import { showClientInfo } from "./modules/cli/show-cli-info";
import { updateCli } from "./modules/cli/update-cli";
import { execCluster } from "./modules/cluster/cli-cluster";
import { execDotenvCommand } from "./modules/deploy/dotenv-exec";
import { parseOptionsToAppConfig } from "./modules/deploy/parse-options-to-app-config";
import { requestDeploy } from "./modules/deploy/request-deploy";
import { execKubectl } from "./modules/k8s/kubectl-cli";
import { testCommand } from "./modules/test-command";

/**
 * Initialize CONFIG STORE (in document directory of the local machine)
 */
// export const conf = new Configstore(pkg.name);

export async function processCLI(options?: InputOptions) {
	options.version = currentVersion();

	let env = "dev";
	if (options.isStaging) env = "staging";
	if (options.isProd) env = "prod";
	if (options.env) env = options.env;

	// debugging info
	if (options.isDebugging) {
		await showClientInfo(options);
		console.log("CLI options :>> ", options);
	}

	switch (options.action) {
		case "test":
			await testCommand(options);
			break;

		case "info":
			await showClientInfo(options);
			break;

		case "profile":
			await showProfile(options);
			break;

		case "login":
			await cliLogin({
				secondAction: options.secondAction,
				url: options.url,
				accessToken: options.token,
				apiToken: options.apiToken,
				isDebugging: options.isDebugging,
			});
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
			return logWarn(`This command is deprecated.`);

		case "log":
		case "logs":
			return viewAppLogs(options);

		case "ask":
			await cliAuthenticate(options);
			await execAI(options);
			break;

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

		case "kubectl":
		case "kb":
			await cliAuthenticate(options);
			await execKubectl(options);
			return;

		case "build":
			await cliAuthenticate(options);
			await requestBuild(options);
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

		case "up":
		case "deploy":
			await cliAuthenticate(options);
			// request server to build & deploy from source
			if (options.envs.length > 1) {
				// deploy to multiple deploy envs
				for (const _env of options.envs) {
					options.env = _env;
					await requestDeploy(options);
				}
			} else {
				// deploy to single deploy env
				await requestDeploy(options);
			}
			return;

		case "rollout":
			return logWarn(`This command is deprecated.`);

		case "down":
			await cliAuthenticate(options);
			await deploy.execTakeDown(options);
			return;

		case "analytics":
			await cliAuthenticate(options);
			await execAnalytics(options);
			return;

		case "free":
			return logWarn(`This command is deprecated.`);

		case "tf":
		case "transfer":
			await cliAuthenticate(options);
			await transferRepo(options);
			return;

		case "snippets":
		case "snpt":
			await generateSnippet(options as any);
			return;

		default:
			yargs.showHelp();
			break;
	}
}

// Only start a server mode when needed
if (process.env.CLI_MODE == "server") import("@/server");

// Otherwise, parse & execute CLI commands...
parseCliOptions().then((inputOptions) =>
	!inputOptions.isDebugging
		? processCLI(inputOptions)
				.then(() => process.exit(0))
				.catch((e) => {
					logError(e.toString());
					process.exit(1);
				})
		: processCLI(inputOptions).then(() => process.exit(1))
);
