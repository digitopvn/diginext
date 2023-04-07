import type { User, Workspace } from "@/entities";

import { seedApiKeys } from "./seed-api-key";
import { seedFrameworks } from "./seed-frameworks";
import { seedDefaultRoles } from "./seed-roles";
import { seedServiceAccounts } from "./seed-service-account";

export * from "./seed-roles";

// seed workspace initial data here...
const seedWorkspaceInitialData = async (workspace: Workspace, owner: User) => {
	// [1] Default roles & permisions first, because Service Account & API_KEY need role
	await seedDefaultRoles(workspace, owner);

	// [2] Create default API access token for this workspace
	// [3] Create default service account for this workspace
	// [4] Create default framework for this workspace
	await Promise.all([seedServiceAccounts(workspace, owner), seedApiKeys(workspace, owner), seedFrameworks(workspace, owner)]);
};

export default seedWorkspaceInitialData;
