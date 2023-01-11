import { logSuccess, logWarn } from "diginext-utils/dist/console/log";
import * as fs from "fs";
import path from "path";

import { CLI_CONFIG_DIR } from "@/config/const";
import type { CloudProvider } from "@/entities";

import digitalocean from "./digitalocean";
import gcloud from "./gcloud";

export const providerAuthenticate = async (provider: CloudProvider, options?: { userId?: any; workspaceId?: any }) => {
	const { shortName } = provider;
	switch (shortName) {
		case "gcloud":
			const { serviceAccount } = provider;

			const filePath = path.resolve(CLI_CONFIG_DIR, `${shortName}-service-account.json`);
			fs.writeFileSync(filePath, serviceAccount, "utf8");

			const gcloudAuth = await gcloud.authenticate({ filePath, ...options });
			if (gcloudAuth) logSuccess(`[CLOUD PROVIDER] Authenticated to Google Cloud provider.`);
			return gcloudAuth;
			break;

		case "digitalocean":
			const { apiAccessToken } = provider;
			const doAuth = await digitalocean.authenticate({ key: apiAccessToken, ...options });
			if (doAuth) logSuccess(`[CLOUD PROVIDER] Authenticated to Digital Ocean cloud provider.`);
			return doAuth;
			break;

		case "custom":
			logSuccess(`[CLOUD PROVIDER] "custom" cloud provider doesn't have authentication method -> Skip.`);
			return;

		default:
			logWarn(`[CLOUD PROVIDER] This cloud provider (${shortName}) is not supported.`);
			break;
	}
};
