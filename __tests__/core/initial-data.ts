import { SVC } from "../helpers";

export function checkInitialData() {
	it("Default cloud providers", async () => {
		const providers = await SVC.provider.find({});
		expect(providers.length).toBe(3);

		const gcloud = providers.find((p) => p.shortName === "gcloud");
		expect(gcloud).toBeDefined();
	});
}
