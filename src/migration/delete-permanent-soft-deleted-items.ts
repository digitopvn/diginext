import type { Schema } from "mongoose";

import { appSchema, buildSchema, clusterSchema, containerRegistrySchema, projectSchema } from "@/entities";
import { BaseService } from "@/services";

async function deletePermanentDeletedItemsInCollection(schema: Schema) {
	const svc = new BaseService(schema);
	// const items = await svc.find({ deletedAt: { $exists: true } });
	// console.log("count :>> ", items.length);
	// console.log("items :>> ", items);
	// return items;
	const res = await svc.delete({ deletedAt: { $exists: true } });
	console.log(`deletePermanentDeletedItemsInCollection :>> `, res.affected);
	return res;
}

export async function deletePermanentSoftDeletedItemsAllCollections() {
	// apps
	await deletePermanentDeletedItemsInCollection(appSchema);
	// projects
	await deletePermanentDeletedItemsInCollection(projectSchema);
	// builds
	await deletePermanentDeletedItemsInCollection(buildSchema);
	// registry
	await deletePermanentDeletedItemsInCollection(containerRegistrySchema);
	// cluster
	await deletePermanentDeletedItemsInCollection(clusterSchema);
	// registry
	await deletePermanentDeletedItemsInCollection(containerRegistrySchema);
}
