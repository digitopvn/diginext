import { log } from "diginext-utils/dist/xconsole/log";

import { DIGINEXT_DOMAIN } from "@/config/const";
import type { IApiKeyAccount } from "@/entities/ApiKeyAccount";
import type { IServiceAccount } from "@/entities/ServiceAccount";
import { generateWorkspaceApiAccessToken, getUnexpiredAccessToken } from "@/plugins";

import { DB } from "../modules/api/DB";

export const migrateDefaultServiceAccountAndApiKeyUser = async () => {
	const workspaces = await DB.find("workspace", {}, { select: ["_id", "slug", "name"] });

	let affectedWs = 0;
	const results = await Promise.all(
		workspaces.map(async (ws) => {
			// find default Service Account of this workspace:
			const totalServiceAccounts = await DB.count("service_account", { workspaces: ws._id });
			// console.log("serviceAccounts :>> ", serviceAccounts);
			const moderatorRole = await DB.findOne("role", { type: "moderator" }, { select: ["_id", "name"] });
			if (totalServiceAccounts === 0) {
				log(`[MIGRATION] migrateDefaultServiceAccount() > Found "${ws.name}" workspace doesn't have any Service Account.`);

				const newToken = generateWorkspaceApiAccessToken();

				const saDto = {} as IServiceAccount;
				saDto.type = "service_account";
				saDto.name = "Default Service Account";
				saDto.email = `default.${newToken.name}@${ws.slug}.${DIGINEXT_DOMAIN}`;
				saDto.active = true;
				saDto.roles = [];
				saDto.workspaces = [ws._id];
				saDto.activeWorkspace = ws._id;
				saDto.token = getUnexpiredAccessToken(newToken.value);

				// assign "moderator" role to service account:
				if (moderatorRole) saDto.roles = [moderatorRole._id];

				const saUser = await DB.create("service_account", saDto);

				affectedWs++;
			}

			// find default API_KEY user of this workspace
			const totalApiKeyUsers = await DB.count("api_key_user", { workspaces: ws._id });
			if (totalApiKeyUsers === 0) {
				log(`[MIGRATION] migrateDefaultServiceAccount() > Found "${ws.name}" workspace doesn't have any default API_KEY user.`);

				const newToken = generateWorkspaceApiAccessToken();

				const apiUserDto = {} as IApiKeyAccount;
				apiUserDto.type = "api_key";
				apiUserDto.name = "API_ACCESS_TOKEN";
				apiUserDto.email = `api.${newToken.name}@${ws.slug}.${DIGINEXT_DOMAIN}`;
				apiUserDto.active = true;
				apiUserDto.roles = [];
				apiUserDto.workspaces = [ws._id];
				apiUserDto.activeWorkspace = ws._id;
				apiUserDto.token = getUnexpiredAccessToken(newToken.value);

				// assign "moderator" role to API_KEY:
				if (moderatorRole) apiUserDto.roles = [moderatorRole._id];

				const apiKeyUser = await DB.create("api_key_user", apiUserDto);

				affectedWs++;
			}
		})
	);

	if (affectedWs > 0) log(`[MIGRATION] migrateDefaultApiAccessToken() > FINISH MIGRATION >> Affected ${affectedWs} workspaces.`);

	return results;
};
