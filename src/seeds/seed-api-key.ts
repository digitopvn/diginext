// import { Role } from "@/entities";

import { log } from "diginext-utils/dist/console/log";

import { DIGINEXT_DOMAIN } from "@/config/const";
import type { Role, User, Workspace } from "@/entities";
import ApiKeyAccount from "@/entities/ApiKeyAccount";
import { DB } from "@/modules/api/DB";
import { generateWorkspaceApiAccessToken, getUnexpiredAccessToken } from "@/plugins";

export const seedApiKeys = async (workspace: Workspace, owner: User) => {
	// seed default API ACCESS TOKEN:
	const apiKeyToken = generateWorkspaceApiAccessToken();

	const moderatorRole = await DB.findOne<Role>("role", { type: "moderator", workspace: workspace._id });

	const apiKeyDto = new ApiKeyAccount();
	apiKeyDto.type = "api_key";
	apiKeyDto.name = "API_ACCESS_TOKEN";
	apiKeyDto.email = `${apiKeyToken.name}@${workspace.slug}.${DIGINEXT_DOMAIN}`;
	apiKeyDto.active = true;
	apiKeyDto.roles = [moderatorRole._id];
	apiKeyDto.workspaces = [workspace._id];
	apiKeyDto.activeWorkspace = workspace._id;
	apiKeyDto.token = getUnexpiredAccessToken(apiKeyToken.value);

	const apiKey = await DB.create<ApiKeyAccount>("api_key_user", apiKeyDto);
	if (apiKey) log(`[WORKSPACE_CONTROLLER] Created "${apiKey.name}" successfully.`);

	return apiKey;
};
