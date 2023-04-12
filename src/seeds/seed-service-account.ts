// import { Role } from "@/entities";

import { log } from "diginext-utils/dist/console/log";

import { DIGINEXT_DOMAIN } from "@/config/const";
import type { Role, User, Workspace } from "@/entities";
import type ServiceAccount from "@/entities/ServiceAccount";
import { DB } from "@/modules/api/DB";
import { generateWorkspaceApiAccessToken, getUnexpiredAccessToken } from "@/plugins";

export const seedServiceAccounts = async (workspace: Workspace, owner: User) => {
	// seed default service account:
	const serviceAccountToken = generateWorkspaceApiAccessToken();
	const moderatorRole = await DB.findOne<Role>("role", { type: "moderator", workspace: workspace._id });

	const serviceAccountDto: ServiceAccount = {
		type: "service_account",
		name: "Default Service Account",
		email: `default.${serviceAccountToken.name}@${workspace.slug}.${DIGINEXT_DOMAIN}`,
		active: true,
		roles: [moderatorRole._id],
		workspaces: [workspace._id],
		activeWorkspace: workspace._id,
		token: getUnexpiredAccessToken(serviceAccountToken.value),
	};
	const serviceAccount = await DB.create<ServiceAccount>("service_account", serviceAccountDto);
	if (serviceAccount) log(`Workspace "${workspace.name}" > Created "${serviceAccount.name}" successfully.`);

	return serviceAccount;
};
