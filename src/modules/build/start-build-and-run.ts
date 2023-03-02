import { logWarn } from "diginext-utils/dist/console/log";
import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import inquirer from "inquirer";

import type InputOptions from "@/interfaces/InputOptions";
import { getAppConfig, resolveDockerfilePath, saveAppConfig } from "@/plugins";

import { askForDomain } from "./ask-for-domain";
import { startBuild } from "./start-build";

export const startBuildAndRun = async (options: InputOptions) => {
	if (!options.targetDirectory) options.targetDirectory = process.cwd();
	const appConfig = getAppConfig(options.targetDirectory);

	const { env = "dev", targetDirectory } = options;

	let domains: string[],
		selectedSSL: "letsencrypt" | "custom" | "none" = "letsencrypt",
		selectedSecretName;

	// try to find any "Dockerfile" to build, it it's not existed, throw error!
	const dockerFile = resolveDockerfilePath({ targetDirectory, env });
	if (!dockerFile) return;

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
	selectedSecretName = `tls-secret-${selectedSSL}-${appConfig.project}-${appConfig.slug}`;

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

	/**
	 * Generate build number as docker image tag
	 */
	const { imageURL, namespace } = appConfig.environment[env];

	options.slug = appConfig.slug; // ! required
	options.projectSlug = appConfig.project; // ! required
	options.namespace = namespace; // ! required
	options.buildNumber = makeDaySlug({ divider: "" }); // ! required
	options.buildImage = `${imageURL}:${options.buildNumber}`; // ! required

	const buildStatus = await startBuild(options, { shouldRollout: true });

	return buildStatus;
};
