import fetchApi from "../../src/modules/api/fetchApi";

export function checkSystemStatus() {
	it("System is up", async () => {
		const res = await fetchApi({ url: "/api/v1/healthz" });
		expect(res.status).toBe(1);
	});
}
