import { logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import { unlink } from "fs";

import type { CloudProvider } from "@/entities";
import { createTmpFile } from "@/plugins";

import digitalocean from "./digitalocean";
import gcloud from "./gcloud";

export const providerAuthenticate = async (provider: CloudProvider, options?: { userId?: any; workspaceId?: any }) => {
	const { shortName } = provider;

	switch (shortName) {
		case "gcloud":
			const { serviceAccount } = provider;

			const filePath = createTmpFile(`gsa.json`, serviceAccount);

			const gcloudAuth = await gcloud.authenticate({ filePath, ...options });
			if (gcloudAuth) logSuccess(`[CLOUD PROVIDER] ✓ Authenticated to Google Cloud provider.`);

			// delete temporary file
			unlink(filePath, (err) => logError(err));

			return gcloudAuth;

		case "digitalocean":
			const { apiAccessToken } = provider;
			const doAuth = await digitalocean.authenticate({ key: apiAccessToken, ...options });
			if (doAuth) logSuccess(`[CLOUD PROVIDER] ✓ Authenticated to Digital Ocean cloud provider.`);
			return doAuth;

		case "custom":
			logSuccess(`[CLOUD PROVIDER] ✓ Skipped ("custom" cloud provider doesn't have authentication method).`);
			return;

		default:
			logWarn(`[CLOUD PROVIDER] This cloud provider (${shortName}) is not supported.`);
			break;
	}
};
