import { logWarn } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";

import type { App } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";
import { getAppConfig, saveAppConfig } from "@/plugins";

import fetchApi from "../api/fetchApi";
import { generateDeployment } from "../deploy/generate-deployment";
import { askForDomain } from "./ask-for-domain";
import { startBuild } from "./start-build";

export const startBuildAndRun = async (options: InputOptions) => {
	if (!options.targetDirectory) options.targetDirectory = process.cwd();
	const appConfig = getAppConfig(options.targetDirectory);

	const { env = "dev", targetDirectory } = options;

	let domains: string[],
		selectedSSL: "letsencrypt" | "custom" | "none" = "letsencrypt",
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

	// Generate the deployment before build & deploy
	const { deploymentContent, prereleaseDeploymentContent, nsName, IMAGE_NAME, BUILD_NUMBER } = await generateDeployment(options);
	options.namespace = nsName;
	options.buildImage = IMAGE_NAME;
	options.buildNumber = BUILD_NUMBER;

	// ! IMPORTANT: Save the YAML deployment to "app.environment[env]" !
	// So it can be used to create release from build
	appConfig.environment[env].deploymentYaml = deploymentContent;
	appConfig.environment[env].prereleaseDeploymentYaml = prereleaseDeploymentContent;

	// update this app's environment in database:
	const updatedApp: any = {};
	updatedApp[`environment.${env}`] = JSON.stringify(appConfig.environment[env]);
	updatedApp.lastUpdatedBy = options.username;
	// console.log("updatedApp :>> ", updatedApp);

	// Update user, project when deploying
	const { status, data: app } = await fetchApi<App>({
		url: `/api/v1/app?slug=${appConfig.slug}`,
		method: "PATCH",
		data: updatedApp,
	});

	const buildStatus = await startBuild(options, { shouldRollout: true });

	return buildStatus;
};
