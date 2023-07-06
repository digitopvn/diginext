import type { IUser, IWorkspace } from "@/entities";

import { seedApiKeys } from "./seed-api-key";
import { seedClusters } from "./seed-clusters";
import { seedFrameworks } from "./seed-frameworks";
import { seedDefaultProjects } from "./seed-projects";
import { seedDefaultRoles } from "./seed-roles";
import { seedServiceAccounts } from "./seed-service-account";

export * from "./seed-roles";

// seed workspace initial data here...
const seedWorkspaceInitialData = async (workspace: IWorkspace, owner: IUser) => {
	// [1] Default roles & permisions first, because Service Account & API_KEY need role
	const roles = await seedDefaultRoles(workspace, owner);

	// [2] Create default API access token for this workspace
	// [3] Create default service account for this workspace
	// [4] Create default frameworks for this workspace
	// [5] Create default project for this workspace
	const results = await Promise.all([
		seedServiceAccounts(workspace, owner),
		seedApiKeys(workspace, owner),
		seedDefaultProjects(workspace, owner),
		seedFrameworks(workspace, owner),
		seedClusters(workspace, owner),
	]);

	return [roles, ...results];
};

export default seedWorkspaceInitialData;
