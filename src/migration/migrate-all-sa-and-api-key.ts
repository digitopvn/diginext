import type { Role, Workspace } from "@/entities";
import type ApiKeyAccount from "@/entities/ApiKeyAccount";
import type ServiceAccount from "@/entities/ServiceAccount";
import { DB } from "@/modules/api/DB";

export const migrateServiceAccountAndApiKey = async () => {
	const workspaces = (await DB.find<Workspace>("workspace", {})) || [];

	// create default roles for each workspace: Admin, Moderator & Member
	for (const ws of workspaces) {
		// Moderator
		const moderatorRole = await DB.findOne<Role>("role", { type: "moderator", workspace: ws._id });

		// find all service accounts & API keys of this workspace and assign "moderator" role:
		let sas = await DB.find<ServiceAccount>("service_account", { workspaces: ws._id, roles: { $nin: [moderatorRole._id] } });
		if (sas.length > 0) {
			sas = await DB.update<ServiceAccount>("service_account", { workspaces: ws._id }, { roles: [moderatorRole._id] });
			console.log(`Workspace "${ws.name}" > Assign "moderator" role to ${sas.length} service accounts`);
		}

		let keys = await DB.find<ApiKeyAccount>("api_key_user", { workspaces: ws._id, roles: { $nin: [moderatorRole._id] } });
		if (keys.length > 0) {
			keys = await DB.update<ApiKeyAccount>("api_key_user", { workspaces: ws._id }, { roles: [moderatorRole._id] });
			console.log(`Workspace "${ws.name}" > Assign "moderator" role to ${keys.length} API keys`);
		}
	}
};
