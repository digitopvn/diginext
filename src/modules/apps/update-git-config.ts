import { logError } from "diginext-utils/dist/xconsole/log";

import type { AppDto, AppGitInfo, IApp } from "@/entities";

export const updateAppGitInfo = async (app: IApp, gitInfo: AppGitInfo) => {
	const { DB } = await import("@/modules/api/DB");
	const updateData = {} as AppDto;
	updateData.git = gitInfo;

	// console.log("[INIT APP] updateData :>> ", updateData);
	const updatedApp = await DB.updateOne("app", { slug: app.slug }, updateData);
	// console.log("[INIT APP] updatedApp :>> ", updatedApp);

	if (!updatedApp) logError(`[INIT APP] Can't initialize app due to network issue.`);

	return updatedApp;
};
