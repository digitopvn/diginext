// Imports the Google Analytics Admin API client library
// const analyticsAdmin = require("@google-analytics/admin");
import { AnalyticsAdminServiceClient, protos } from "@google-analytics/admin";
import chalk from "chalk";
import Table from "cli-table";

import { ANALYTICS_SA_PATH } from "../../config/const";
import { getAppConfig, logError, logInfo, saveAppConfig } from "../../plugins/utils";

// const { Account } = v1alpha;
const { google } = protos;

// google.analytics.admin.v1alpha.Account

// Instantiates a client using default credentials.
let analyticsAdminClient = new AnalyticsAdminServiceClient({ keyFilename: ANALYTICS_SA_PATH });

// TODO: update fetch command from Analytics API
export async function getAnalyticsAccount() {
	// Calls listAccounts() method of the Google Analytics Admin API and prints
	// the response for each account.

	// const [accounts] = await analyticsAdminClient.listAccounts();
	// accounts.forEach((account) => logInfo(account));

	// return accounts[0];
	return null;
}

export const listAnalyticsProperties = async () => {
	const account = await getAnalyticsAccount();

	// const properties = await analyticsAdminClient.listProperties({filter: })
	return account;
};

export const createAnalyticsProperty = async ({ env = "dev", name, url }) => {
	const diginext = getAppConfig();

	// if (!name) logError(`"name" is required`);
	// if (!url) logError(`"url" is required`);

	const accountName = name || diginext.name;
	let websiteUrl = url || (diginext.environment[env].domains && diginext[env].domains[0]);
	if (typeof websiteUrl == "undefined" && env == "dev") websiteUrl = `https://dev3.digitop.vn/${diginext.slug}`;

	if (!websiteUrl) logError(`[${env.toUpperCase()}] Website URL is required, double check domain name in your "dx.json".`);

	const account = await getAnalyticsAccount();
	// await analyticsAdminClient.updateAccount({ account: account });
	// await analyticsAdminClient.provisionAccountTicket({account: account})
	let properties, property;
	let webStreams, webStream;

	// // delete properties
	// try {
	// 	properties = await analyticsAdminClient.listProperties({ filter: `parent:${account.name}` });
	// 	logInfo(`properties:`, properties[0]);
	// } catch (e) {
	// 	logError(e);
	// }

	// await Promise.all(
	// 	properties[0]
	// 		.filter((prop) => prop.displayName == "Digichat")
	// 		.map((prop) => analyticsAdminClient.deleteProperty({ name: prop.name }))
	// );

	// // list properties
	// try {
	// 	properties = await analyticsAdminClient.listProperties({ filter: `parent:${account.name}` });
	// 	logInfo(`properties:`, properties[0]);
	// } catch (e) {
	// 	logError(e);
	// }

	// return;

	// // check web stream existed
	// try {
	// 	webStreams = await analyticsAdminClient.listWebDataStreams({ filter: `parent:${property.name}` });
	// } catch (e) {
	// 	logError(e);
	// }

	try {
		const createPropertyResults = await analyticsAdminClient.createProperty({
			property: {
				parent: account.name, // accounts/1324324
				displayName: accountName,
				currencyCode: "VND",
				// countryCode: "vi",
				industryCategory: "ARTS_AND_ENTERTAINMENT",
				timeZone: "Asia/Saigon",
			},
		});
		property = createPropertyResults[0];
		// logInfo(req);
	} catch (e) {
		logError(e);
	}
	// SDK.v1alpha.AnalyticsAdminServiceClient

	try {
		webStreams = await analyticsAdminClient.createWebDataStream({
			parent: property.name,
			webDataStream: {
				defaultUri: websiteUrl,
				displayName: accountName,
			},
		});
		webStream = webStreams[0];
		let table = new Table();
		table.push(["GA4 ID:", chalk.cyan(webStream.measurementId)]);
		logInfo(`\n` + table.toString());
	} catch (e) {
		logError(e);
	}

	// logInfo(webStream);
	// logInfo(webStream.name);
	// let tag;
	// try {
	// 	const tags = await analyticsAdminClient.getGlobalSiteTag({ name: webStream.name + "/globalSiteTag" });
	// 	tag = tags[0];
	// 	logInfo("Global Site Tag:", tag);
	// } catch (e) {
	// 	logError(e);
	// }

	// diginext.ga = diginext.ga || {};
	// diginext.ga[env] = diginext.ga[env] ? [...diginext.ga[env], webStream.measurementId] : [webStream.measurementId];

	saveAppConfig(diginext);
};

// main(...process.argv.slice(2)).catch((err) => {
//   console.error(err.message);
//   process.exitCode = 1;
// });
// process.on("unhandledRejection", (err) => {
//   console.error(err.message);
//   process.exitCode = 1;
// });
