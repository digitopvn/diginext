import { logError } from "diginext-utils/dist/console/log";

import type { ICloudProvider } from "@/entities";

/**
 * @deprecated
 */
export const providerAuthenticate = async (provider: ICloudProvider, options?: { userId?: any; workspaceId?: any }) => {
	return logError(`[CLOUD_PROVIDER] "providerAuthenticate()" was deprecated.`);
	// const { shortName } = provider;

	// switch (shortName) {
	// 	case "gcloud":
	// 		const { serviceAccount } = provider;

	// 		const filePath = createTmpFile(`gsa.json`, serviceAccount);

	// 		const gcloudAuth = await gcloud.authenticate({ filePath, ...options });
	// 		if (gcloudAuth) logSuccess(`[CLOUD PROVIDER] ✓ Authenticated to Google Cloud provider.`);

	// 		// delete temporary file
	// 		// unlink(filePath, (err) => err && logError(`[REGISTRY CONTROLLER] Remove tmp file:`, err));

	// 		return gcloudAuth;

	// 	case "digitalocean":
	// 		const { apiAccessToken } = provider;
	// 		const doAuth = await digitalocean.authenticate({ key: apiAccessToken, ...options });
	// 		if (doAuth) logSuccess(`[CLOUD PROVIDER] ✓ Authenticated to Digital Ocean cloud provider.`);
	// 		return doAuth;

	// 	case "custom":
	// 		logSuccess(`[CLOUD PROVIDER] ✓ Skipped ("custom" cloud provider doesn't have authentication method).`);
	// 		return;

	// 	default:
	// 		logWarn(`[CLOUD PROVIDER] This cloud provider (${shortName}) is not supported.`);
	// 		break;
	// }
};
