import { logError } from "diginext-utils/dist/xconsole/log";

import type { ICloudProvider } from "@/entities";

/**
 * @deprecated
 */
export const providerAuthenticate = async (provider: ICloudProvider, options?: { userId?: any; workspaceId?: any }) => {
	return logError(`[CLOUD_PROVIDER] "providerAuthenticate()" was deprecated.`);
};
