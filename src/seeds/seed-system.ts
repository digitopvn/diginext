import { log } from "diginext-utils/dist/console/log";

import type { ICloudProvider } from "@/entities";
import { seedSystemRoutes } from "@/migration/seed-all-routes";
import { DB } from "@/modules/api/DB";

const initialCloudProviders = [
	{
		name: "Google Cloud",
		shortName: "gcloud",
	},
	{
		name: "Digital Ocean",
		shortName: "digitalocean",
	},
	{
		name: "Others",
		shortName: "custom",
	},
] as ICloudProvider[];

export const seedDefaultProviders = async () => {
	const results = (
		await Promise.all(
			initialCloudProviders.map(async (providerData) => {
				const provider = await DB.findOne<ICloudProvider>("provider", { shortName: providerData.shortName });
				if (!provider) {
					const newProvider = await DB.create<ICloudProvider>("provider", providerData);
					return newProvider;
				}
			})
		)
	).filter((res) => typeof res !== "undefined");

	if (results.length > 0) log(`[SEEDING] Seeded ${results.length} cloud providers.`);
};

export const seedSystemInitialData = async () => {
	// cloud providers
	await seedDefaultProviders();

	// system routes
	await seedSystemRoutes();
};
