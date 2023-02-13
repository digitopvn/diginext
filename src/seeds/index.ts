import { seedRoles } from "./seed-roles";
import { seedRoutes } from "./seed-routes";

export * from "./seed-roles";
export * from "./seed-routes";

const seedInitialData = async (workspaceId: string, ownerId: string) => {
	// seed initial data here...
	await seedRoutes();
	await seedRoles(workspaceId, ownerId);
	// await Promise.all([seedRoles, seedRoutes]);
};

export default seedInitialData;
