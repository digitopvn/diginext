import { log } from "diginext-utils/dist/console/log";
import type { ObjectId } from "mongodb";

import { DIGINEXT_DOMAIN } from "@/config/const";
import type { Workspace } from "@/entities";
import { User } from "@/entities";
import { DB } from "@/modules/api/DB";
import { generateWorkspaceApiAccessToken, getUnexpiredAccessToken } from "@/plugins";

import { seedRoles } from "./seed-roles";

export * from "./seed-roles";
export * from "./seed-routes";

const seedWorkspaceInitialData = async (newWorkspace: Workspace, ownerId?: ObjectId) => {
	// seed initial data here...

	const workspaceId: string = newWorkspace._id.toString();

	// [1] seed default roles...
	await seedRoles(newWorkspace, ownerId);

	// [2] Create "default" API access token user for this workspace:
	const apiKeyToken = generateWorkspaceApiAccessToken();

	const apiKeyUserDto = new User();
	apiKeyUserDto.type = "api_key";
	apiKeyUserDto.name = "Default API_KEY Account";
	apiKeyUserDto.email = `${apiKeyToken.name}@${newWorkspace.slug}.${DIGINEXT_DOMAIN}`;
	apiKeyUserDto.active = true;
	apiKeyUserDto.roles = [];
	apiKeyUserDto.workspaces = [newWorkspace._id];
	apiKeyUserDto.activeWorkspace = newWorkspace._id;
	apiKeyUserDto.token = getUnexpiredAccessToken(apiKeyToken.value);

	const apiKeyUser = await DB.create("user", apiKeyUserDto);
	if (apiKeyUser) log(`[WORKSPACE_CONTROLLER] Created "${apiKeyUser.name}" successfully.`);

	// [3] Create default service account for this workspace
	const serviceAccountToken = generateWorkspaceApiAccessToken();
	const serviceAccountDto: User = {
		type: "service_account",
		name: "Default Service Account",
		email: `default.${serviceAccountToken.name}@${newWorkspace.slug}.${DIGINEXT_DOMAIN}`,
		active: true,
		roles: [],
		workspaces: [workspaceId],
		activeWorkspace: workspaceId,
		token: getUnexpiredAccessToken(serviceAccountToken.value),
	};
	const serviceAccount = await DB.create<User>("user", serviceAccountDto);
	if (apiKeyUser) log(`[WORKSPACE_CONTROLLER] Created "${serviceAccount.name}" successfully.`);
};

export default seedWorkspaceInitialData;
