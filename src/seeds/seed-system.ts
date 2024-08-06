import type { ICloudProvider } from "@/entities";
import { seedSystemRoutes } from "@/seeds/seed-all-routes";

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

export const seedDefaultCloudProviders = async () => {
	const { DB } = await import("@/modules/api/DB");
	const results = (
		await Promise.all(
			initialCloudProviders.map(async (providerData) => {
				const provider = await DB.findOne("provider", { shortName: providerData.shortName }, { ignorable: true });
				if (!provider) {
					const newProvider = await DB.create("provider", providerData);
					return newProvider;
				}
			})
		)
	).filter((res) => typeof res !== "undefined");

	return results;
};

export const seedSystemInitialData = async () => {
	// cloud providers
	await seedDefaultCloudProviders();

	// system routes
	await seedSystemRoutes();
};
