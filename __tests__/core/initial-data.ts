import { providerSvc } from "../helpers";

export function checkInitialData() {
	it("Default cloud providers", async () => {
		const providers = await providerSvc.find({});
		expect(providers.length).toBe(3);

		const gcloud = providers.find((p) => p.shortName === "gcloud");
		expect(gcloud).toBeDefined();
	});
}
