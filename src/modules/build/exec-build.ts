import { logWarn } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import inquirer from "inquirer";

import type InputOptions from "@/interfaces/InputOptions";
import type { SslIssuer } from "@/interfaces/SystemTypes";

import { getAppConfig, resolveDockerfilePath, saveAppConfig } from "../../plugins/utils";
import { askForDomain } from "./ask-for-domain";
import { startBuild } from "./start-build";

/**
 * This command allow you to build & deploy your application directly from your machine, without requesting to the build server.
 * Notes that it could lead to platform conflicts if your machine & your cluster are running different OS.
 * @param options
 * @returns
 */
export async function execBuild(options: InputOptions) {
	if (typeof options.targetDirectory == "undefined") options.targetDirectory = process.cwd();

	const appConfig = getAppConfig(options.targetDirectory);

	const { env = "dev", targetDirectory } = options;

	// check Dockerfile
	let dockerFile = resolveDockerfilePath({ targetDirectory, env });
	if (!dockerFile) return;

	let domains: string[],
		selectedSSL: SslIssuer = "letsencrypt",
		selectedSecretName;

	// ask for generated domains:
	domains = await askForDomain(options);
	if (domains.length < 1) {
		logWarn(
			`This app doesn't have any domains configurated & only visible to the namespace scope, you can add your own domain to "dx.json" to expose this app to the internet anytime.`
		);
	}
	appConfig.environment[env].domains = domains;

	// if they have any domains, ask if they want to use "letsencrypt":
	if (appConfig.environment[env].domains.length > 0 && !appConfig.environment[env].ssl) {
		const askSSL = await inquirer.prompt({
			type: "list",
			name: "selectedSSL",
			message: `Which SSL certificate do you want to use for these domains?`,
			default: "letsencrypt",
			choices: ["letsencrypt", "custom", "none"],
		});
		selectedSSL = askSSL.selectedSSL;
	}
	selectedSecretName = `tls-secret-${selectedSSL}-${makeSlug(appConfig.environment[env].domains[0])}`;

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

	appConfig.environment[env].ssl = selectedSSL;
	appConfig.environment[env].tlsSecret = selectedSecretName;

	// save domains & SSL configs
	saveAppConfig(appConfig, { directory: targetDirectory });

	// request build server to build & deploy:
	const buildStatus = await startBuild(options);
	return buildStatus;
}
