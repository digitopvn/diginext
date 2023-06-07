import { logError, logWarn } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type InputOptions from "@/interfaces/InputOptions";
import type { SslIssuer } from "@/interfaces/SystemTypes";
import { makeSlug } from "@/plugins/slug";

import { resolveDockerfilePath } from "../../plugins/utils";
import { getAppConfigFromApp } from "../apps/app-helper";
import { askForProjectAndApp } from "../apps/ask-project-and-app";
import { updateAppConfig } from "../apps/update-config";
import { askForDomain } from "./ask-for-domain";
import { startBuildV1 } from "./start-build";

/**
 * This command allow you to build & deploy your application directly from your machine, without requesting to the build server.
 * Notes that it could lead to platform conflicts if your machine & your cluster are running different OS.
 * @deprecated
 */
export async function execBuild(options: InputOptions) {
	if (typeof options.targetDirectory == "undefined") options.targetDirectory = process.cwd();

	const { env = "dev", targetDirectory } = options;

	let { app } = await askForProjectAndApp(options.targetDirectory, options);

	let appConfig = getAppConfigFromApp(app);
	const { project, slug } = appConfig;
	const deployEnvironment = appConfig.deployEnvironment[env];

	// check Dockerfile
	let dockerFile = resolveDockerfilePath({ targetDirectory, env });
	if (!dockerFile) return;

	let domains: string[],
		selectedSSL: SslIssuer = "letsencrypt",
		selectedSecretName;

	// ask for generated domains:
	try {
		domains = await askForDomain(env, project, slug, deployEnvironment);
	} catch (e) {
		logError(`[EXEC_BUILD] ${e}`);
		return;
	}

	if (isEmpty(domains)) {
		domains = [];
		logWarn(
			`This app doesn't have any domains configurated & only visible to the namespace scope, you can add your own domain to "dx.json" to expose this app to the internet anytime.`
		);
	}
	appConfig.deployEnvironment[env].domains = domains;

	// if they have any domains, ask if they want to use "letsencrypt":
	if (appConfig.deployEnvironment[env].domains.length > 0 && !appConfig.deployEnvironment[env].ssl) {
		const askSSL = await inquirer.prompt({
			type: "list",
			name: "selectedSSL",
			message: `Which SSL certificate do you want to use for these domains?`,
			default: "letsencrypt",
			choices: ["letsencrypt", "custom", "none"],
		});
		selectedSSL = askSSL.selectedSSL;
	}
	selectedSecretName = `tls-secret-${selectedSSL}-${makeSlug(appConfig.deployEnvironment[env].domains[0])}`;

	// if they select "custom" SSL certificate -> ask for secret name:
	if (selectedSSL == "custom") {
		const askSecretName = await inquirer.prompt({
			type: "input",
			name: "secretName",
			message: `Name your custom SSL secret (ENTER to use default):`,
			default: selectedSecretName,
		});
		selectedSecretName = askSecretName.secretName;
	}

	appConfig.deployEnvironment[env].ssl = selectedSSL;
	appConfig.deployEnvironment[env].tlsSecret = selectedSecretName;

	// save domains & SSL configs
	appConfig = await updateAppConfig(app, env, appConfig.deployEnvironment[env]);

	// request build server to build & deploy:
	const buildStatus = await startBuildV1(options);
	return buildStatus;
}
