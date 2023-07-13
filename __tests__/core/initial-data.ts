import { providerSvc } from "../helpers";

export function checkInitialData() {
	it("System: Default 3 cloud providers", async () => {
		const providers = await providerSvc.find({});
		expect(providers.length).toBe(3);

		const gcloud = providers.find((p) => p.shortName === "gcloud");
		expect(gcloud).toBeDefined();

		const digitalocean = providers.find((p) => p.shortName === "digitalocean");
		expect(digitalocean).toBeDefined();

		const custom = providers.find((p) => p.shortName === "custom");
		expect(custom).toBeDefined();
	});
}
