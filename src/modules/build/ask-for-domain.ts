import chalk from "chalk";
import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";

import { DIGINEXT_DOMAIN } from "@/config/const";
import type { IApp, IWorkspace } from "@/entities";
import type { ClientDeployEnvironmentConfig } from "@/interfaces";

import { DB } from "../api/DB";
import { generateDomains } from "../deploy/generate-domain";

export const askForDomain = async (env: string, projectSlug: string, appSlug: string, deployEnvironment: ClientDeployEnvironmentConfig) => {
	let subdomainName = `${projectSlug}-${appSlug}.${env}`;
	let domains: string[] = [];

	let generatedDomain = `${subdomainName}.${DIGINEXT_DOMAIN}`;
	if (generatedDomain.length > 60) {
		subdomainName = `${appSlug}-${makeDaySlug({ divider: "" })}`;
		generatedDomain = `${subdomainName}.${DIGINEXT_DOMAIN}`;
		logWarn(`This app's domain is too long, it will be shorten randomly to: ${generatedDomain}`);
	}
	const clusterShortName = deployEnvironment.cluster;

	const app = await DB.findOne<IApp>("app", { slug: appSlug }, { populate: ["workspace"] });
	if (!app) throw new Error(`[ASK_FOR_DOMAIN] App "${appSlug}" not found.`);
	// console.log("app.workspace :>> ", app.workspace);

	const workspace = app.workspace as IWorkspace;

	// xử lý domains
	if (typeof deployEnvironment.domains != "undefined" && deployEnvironment.domains.length > 0) {
		// lấy domain trong app config
		domains = deployEnvironment.domains;
	} else {
		logWarn(`No domains were found in this deploy environment (${env})`);

		const { useGeneratedDomain } = await inquirer.prompt({
			name: "useGeneratedDomain",
			type: "confirm",
			message: `Do you want to use our generated domain: ${chalk.green(
				generatedDomain
			)}? (You can update it anytime in your Diginext workspace)`,
			default: true,
		});

		if (useGeneratedDomain) {
			const { status, ip, domain, messages } = await generateDomains({
				workspace,
				primaryDomain: DIGINEXT_DOMAIN,
				subdomainName,
				clusterShortName,
			});

			if (status === 0) throw new Error(messages.join("."));

			// in case the domain was existed, it will automatically generate a new one
			generatedDomain = domain;

			// save app config:
			if (!deployEnvironment.domains) deployEnvironment.domains = [];
			deployEnvironment.domains.push(generatedDomain);

			domains = deployEnvironment.domains;

			logSuccess(`Great! Domain "${generatedDomain}" has been created and pointed to this IP address: ${ip}`);
		} else {
			// logError(`You need a domain to deploy this app. Please add one in: Diginext workspace > project > app > deploy environment"`);
		}
	}

	return domains;
};