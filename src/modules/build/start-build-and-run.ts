import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { logError, logWarn } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type InputOptions from "@/interfaces/InputOptions";
import type { SslIssuer } from "@/interfaces/SystemTypes";
import { getCurrentGitRepoData, resolveDockerfilePath } from "@/plugins";

import { getAppConfigFromApp } from "../apps/app-helper";
import { askForProjectAndApp } from "../apps/ask-project-and-app";
import { updateAppConfig } from "../apps/update-config";
import { updateAppGitInfo } from "../apps/update-git-config";
import { askForDomain } from "./ask-for-domain";
import { startBuildV1 } from "./start-build";

export const startBuildAndRun = async (options: InputOptions) => {
	if (!options.targetDirectory) options.targetDirectory = process.cwd();

	const { env = "dev", targetDirectory } = options;

	let { app } = await askForProjectAndApp(options.targetDirectory, options);

	if (!app.git || !app.git.provider || !app.git.repoSSH || !app.git.repoURL) {
		const gitInfo = await getCurrentGitRepoData(options.targetDirectory);
		if (!gitInfo) throw new Error(`This app's directory doesn't have any git remote integrated.`);

		app = await updateAppGitInfo(app, { provider: gitInfo.provider, repoSSH: gitInfo.remoteSSH, repoURL: gitInfo.remoteURL });
	}

	let appConfig = getAppConfigFromApp(app);

	const { project, slug } = appConfig;
	const deployEnvironment = appConfig.deployEnvironment[env];

	let domains: string[],
		selectedSSL: SslIssuer = "letsencrypt",
		selectedSecretName;

	// try to find any "Dockerfile" to build, it it's not existed, throw error!
	const dockerFile = resolveDockerfilePath({ targetDirectory, env });
	if (!dockerFile) return;

	// ask for generated domains:
	try {
		domains = await askForDomain(env, project, slug, deployEnvironment);
	} catch (e) {
		logError(`[BUILD_AND_RUN] ${e}`);
		return;
	}

	if (isEmpty(domains)) {
		domains = [];
		logWarn(
			`This app doesn't have any domains configurated & only visible to the namespace scope, you can add your own domain to app config on Diginext workspace to expose this app to the internet anytime.`
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

	appConfig.deployEnvironment[env].ssl = selectedSSL;
	appConfig.deployEnvironment[env].tlsSecret = selectedSecretName;

	// save domains & SSL configs
	appConfig = await updateAppConfig(app, env, appConfig.deployEnvironment[env]);

	/**
	 * Generate build number as docker image tag
	 */
	const { imageURL, namespace } = appConfig.deployEnvironment[env];

	options.slug = appConfig.slug; // ! required
	options.projectSlug = appConfig.project; // ! required
	options.namespace = namespace; // ! required
	options.buildNumber = makeDaySlug({ divider: "" }); // ! required
	options.buildImage = `${imageURL}:${options.buildNumber}`; // ! required

	const buildStatus = await startBuildV1(options, { shouldRollout: true });

	return buildStatus;
};
