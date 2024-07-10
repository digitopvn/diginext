import chalk from "chalk";
import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";

import { DIGINEXT_DOMAIN } from "@/config/const";
import type { IWorkspace } from "@/entities";
import type { ClientDeployEnvironmentConfig } from "@/interfaces";

import { generateDomains } from "../deploy/generate-domain";

export function generateDiginextDomain(env: string, projectSlug: string, appSlug: string) {
	let subdomainName = `${projectSlug}-${appSlug}.${env}`;
	let generatedDomain = `${subdomainName}.${DIGINEXT_DOMAIN}`;

	if (generatedDomain.length > 60) {
		subdomainName = `${appSlug}-${makeDaySlug({ divider: "" })}`;
		generatedDomain = `${subdomainName}.${DIGINEXT_DOMAIN}`;
		logWarn(`This app's domain is too long, it will be shorten randomly to: ${generatedDomain}`);
	}

	return { subdomain: subdomainName, domain: generatedDomain };
}

export const askForDomain = async (
	env: string,
	projectSlug: string,
	appSlug: string,
	deployEnvironment: ClientDeployEnvironmentConfig,
	options: { shouldGenerate?: boolean } = { shouldGenerate: true }
) => {
	const { DB } = await import("../api/DB");

	let domains: string[] = [];

	let { subdomain, domain } = generateDiginextDomain(env, projectSlug, appSlug);

	const clusterSlug = deployEnvironment.cluster;

	const app = await DB.findOne("app", { slug: appSlug }, { populate: ["workspace"] });
	if (!app) throw new Error(`[ASK_FOR_DOMAIN] App "${appSlug}" not found.`);
	// console.log("app.workspace :>> ", app.workspace);

	const workspace = app.workspace as IWorkspace;

	// xử lý domains
	if (typeof deployEnvironment.domains != "undefined" && deployEnvironment.domains.length > 0) {
		// lấy domain trong app config
		domains = deployEnvironment.domains;
	} else {
		logWarn(`No domains were found in this deploy environment (${env})`);

		let useGeneratedDomain: boolean;
		if (options?.shouldGenerate) {
			useGeneratedDomain = true;
		} else {
			// ask for permissions to generate new app domain
			const askGenerate = await inquirer.prompt<{ useGeneratedDomain: boolean }>({
				name: "useGeneratedDomain",
				type: "confirm",
				message: `Do you want to use our generated domain: ${chalk.green(domain)}? (You can update it anytime in your Diginext workspace)`,
				default: true,
			});
			useGeneratedDomain = askGenerate.useGeneratedDomain;
		}

		if (useGeneratedDomain) {
			const {
				status,
				ip,
				domain: generatedDomain,
				messages,
			} = await generateDomains({
				workspace,
				subdomainName: subdomain,
				clusterSlug: clusterSlug,
			});

			if (status === 0) throw new Error(messages.join("."));

			// in case the domain was existed, it will automatically generate a new one
			domain = generatedDomain;

			// save app config:
			if (!deployEnvironment.domains) deployEnvironment.domains = [];
			deployEnvironment.domains.push(domain);

			domains = deployEnvironment.domains;

			logSuccess(`Great! Domain "${domain}" has been created and pointed to this IP address: ${ip}`);
		} else {
			// logError(`You need a domain to deploy this app. Please add one in: Diginext workspace > project > app > deploy environment"`);
			domains = [];
		}
	}

	return domains;
};
