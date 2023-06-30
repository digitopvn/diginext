import type { IRole, IWorkspace } from "@/entities";
import type { IApiKeyAccount } from "@/entities/ApiKeyAccount";
import type { IServiceAccount } from "@/entities/ServiceAccount";
import { DB } from "@/modules/api/DB";

export const migrateServiceAccountAndApiKey = async () => {
	const workspaces = (await DB.find<IWorkspace>("workspace", {}, { select: ["_id", "name"] })) || [];

	// create default roles for each workspace: Admin, Moderator & Member
	for (const ws of workspaces) {
		// Moderator
		const moderatorRole = await DB.findOne<IRole>("role", { type: "moderator", workspace: ws._id }, { select: ["_id", "name"] });

		// find all service accounts & API keys of this workspace and assign "moderator" role:
		let sas = await DB.find<IServiceAccount>("service_account", { workspaces: ws._id, roles: { $nin: [moderatorRole._id] } });
		if (sas.length > 0) {
			sas = await DB.update<IServiceAccount>("service_account", { workspaces: ws._id }, { roles: [moderatorRole._id] });
			console.log(`Workspace "${ws.name}" > Assign "moderator" role to ${sas.length} service accounts`);
		}

		let keys = await DB.find<IApiKeyAccount>("api_key_user", { workspaces: ws._id, roles: { $nin: [moderatorRole._id] } });
		if (keys.length > 0) {
			keys = await DB.update<IApiKeyAccount>("api_key_user", { workspaces: ws._id }, { roles: [moderatorRole._id] });
			console.log(`Workspace "${ws.name}" > Assign "moderator" role to ${keys.length} API keys`);
		}
	}
};
