export const migrateServiceAccountAndApiKey = async () => {
	const { DB } = await import("@/modules/api/DB");
	const workspaces = (await DB.find("workspace", {}, { select: ["_id", "name"] })) || [];

	// create default roles for each workspace: Admin, Moderator & Member
	for (const ws of workspaces) {
		// Moderator
		const moderatorRole = await DB.findOne("role", { type: "moderator", workspace: ws._id }, { select: ["_id", "name"] });

		// find all service accounts & API keys of this workspace and assign "moderator" role:
		let sas = await DB.find("service_account", { workspaces: ws._id, roles: { $nin: [moderatorRole._id] } });
		if (sas.length > 0) {
			sas = await DB.update("service_account", { workspaces: ws._id }, { roles: [moderatorRole._id] });
			console.log(`Workspace "${ws.name}" > Assign "moderator" role to ${sas.length} service accounts`);
		}

		let keys = await DB.find("api_key_user", { workspaces: ws._id, roles: { $nin: [moderatorRole._id] } });
		if (keys.length > 0) {
			keys = await DB.update("api_key_user", { workspaces: ws._id }, { roles: [moderatorRole._id] });
			console.log(`Workspace "${ws.name}" > Assign "moderator" role to ${keys.length} API keys`);
		}
	}
};
