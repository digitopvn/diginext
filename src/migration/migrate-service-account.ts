import { log } from "diginext-utils/dist/console/log";
import { isEmpty } from "lodash";

import { DIGINEXT_DOMAIN } from "@/config/const";
import type { User, Workspace } from "@/entities";
import { WorkspaceApiAccessToken } from "@/entities";
import { generateWorkspaceApiAccessToken } from "@/plugins";

import { DB } from "../modules/api/DB";

export const migrateDefaultServiceAccount = async () => {
	const workspaces = (await DB.find<Workspace>("workspace", {})).filter((ws) => isEmpty(ws.apiAccessTokens));
	if (isEmpty(workspaces)) return;

	log(`[MIGRATION] migrateDefaultApiAccessToken() > Found ${workspaces.length} workspaces need migration.`);

	const results = (
		await Promise.all(
			workspaces.map(async (ws) => {
				// default API access token
				const defaultApiAccessToken = new WorkspaceApiAccessToken();
				defaultApiAccessToken.name = "default";
				defaultApiAccessToken.token = generateWorkspaceApiAccessToken();
				defaultApiAccessToken.roles = [];

				// find default service account of this workspace:
				const sas = await DB.find<User>("user", { type: "service_account", workspaces: { $in: [ws._id] } });
				if (isEmpty(sas)) {
					const serviceAccount = await DB.create<User>("user", {
						type: "service_account",
						name: "Default Service Account",
						email: `default@${ws.slug}.${DIGINEXT_DOMAIN}`,
						active: true,
						workspaces: [ws._id],
						activeWorkspace: ws._id,
						token: generateWorkspaceApiAccessToken(),
					});

					log(`[MIGRATION] migrateDefaultServiceAccount() > Created "${serviceAccount.name}" for "${ws.name}" workspace.`);
				}

				return DB.update<Workspace>("workspace", { _id: ws._id }, { apiAccessTokens: [defaultApiAccessToken] });
			})
		)
	)
		.filter((updatedItems) => updatedItems.length > 0)
		.map((updatedItems) => updatedItems[0]);

	log(`[MIGRATION] migrateDefaultApiAccessToken() > FINISH MIGRATION >> Affected ${results.length} workspaces.`);

	return results;
};
