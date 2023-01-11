import chalk from "chalk";
import { logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";

import { DIGINEXT_DOMAIN } from "@/config/const";
import type InputOptions from "@/interfaces/InputOptions";
import { getAppConfig, saveAppConfig } from "@/plugins";

import { generateDomains } from "../deploy/generate-domain";

export const askForDomain = async (options: InputOptions) => {
	const { env } = options;
	const appDirectory = options.targetDirectory;
	const appConfig = getAppConfig(appDirectory);

	let projectSlug = appConfig.project;
	let appSlug = appConfig.slug.toLowerCase();
	let subdomainName = `${projectSlug}-${appSlug}.${env}`;
	let domains: string[] = [];

	const generatedDomain = `${subdomainName}.${DIGINEXT_DOMAIN}`;
	const clusterShortName = appConfig.environment[env].cluster;

	// xử lý domains
	if (typeof appConfig.environment[env].domains != "undefined" && appConfig.environment[env].domains.length > 0) {
		// lấy domain trong "dx.json"
		domains = appConfig.environment[env].domains;
	} else {
		logWarn(`No domains were found in this environment (${env})`);

		const { useGeneratedDomain } = await inquirer.prompt({
			name: "useGeneratedDomain",
			type: "confirm",
			message: `Do you want to use our generated domain: ${chalk.green(generatedDomain)}? (You can update it anytime in your "dx.json" file)`,
			default: true,
		});

		if (useGeneratedDomain) {
			const { status, ip } = await generateDomains({
				primaryDomain: DIGINEXT_DOMAIN,
				subdomainName,
				clusterShortName,
			});
			if (status === 0) {
				logError(`Can't generate this domain (${generatedDomain}).`);
				return;
			}

			// save app config:
			if (!appConfig.environment[env].domains) appConfig.environment[env].domains = [];
			appConfig.environment[env].domains.push(generatedDomain);
			saveAppConfig(appConfig, { directory: options.targetDirectory });

			domains = appConfig.environment[env].domains;

			logSuccess(`Great! Domain "${generatedDomain}" has been created and pointed to this IP address: ${ip}`);
		} else {
			// logError(`You need a domain to deploy this app. Please add one in "dx.json" at path ".environment.${env}.domains[]"`);
		}
	}

	return domains;
};
