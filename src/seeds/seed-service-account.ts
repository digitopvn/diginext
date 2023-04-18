// import { Role } from "@/entities";

import { log } from "diginext-utils/dist/console/log";

import { DIGINEXT_DOMAIN } from "@/config/const";
import type { IRole, IUser, IWorkspace } from "@/entities";
import type { IServiceAccount } from "@/entities/ServiceAccount";
import { DB } from "@/modules/api/DB";
import { generateWorkspaceApiAccessToken, getUnexpiredAccessToken } from "@/plugins";

export const seedServiceAccounts = async (workspace: IWorkspace, owner: IUser) => {
	// seed default service account:
	const serviceAccountToken = generateWorkspaceApiAccessToken();
	const moderatorRole = await DB.findOne<IRole>("role", { type: "moderator", workspace: workspace._id });

	const serviceAccountDto = {
		type: "service_account",
		name: "Default Service Account",
		email: `default.${serviceAccountToken.name}@${workspace.slug}.${DIGINEXT_DOMAIN}`,
		active: true,
		roles: [moderatorRole._id],
		workspaces: [workspace._id],
		activeWorkspace: workspace._id,
		token: getUnexpiredAccessToken(serviceAccountToken.value),
	} as IServiceAccount;
	const serviceAccount = await DB.create<IServiceAccount>("service_account", serviceAccountDto);
	if (serviceAccount) log(`Workspace "${workspace.name}" > Created "${serviceAccount.name}" successfully.`);

	return serviceAccount;
};
