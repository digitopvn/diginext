import { log } from "diginext-utils/dist/console/log";

import type { CloudProvider } from "@/entities";
import { DB } from "@/modules/api/DB";

const initialCloudProviders: CloudProvider[] = [
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
];

export const seedSystemInitialData = async () => {
	// cloud providers
	const results = (
		await Promise.all(
			initialCloudProviders.map(async (providerData) => {
				const provider = await DB.findOne<CloudProvider>("provider", { shortName: providerData.shortName });
				if (!provider) {
					const newProvider = await DB.create<CloudProvider>("provider", providerData);
					return newProvider;
				}
			})
		)
	).filter((res) => typeof res !== "undefined");

	if (results.length > 0) log(`[SEEDING] Seeded ${results.length} cloud providers.`);
};

// export default { seedRoutes };
