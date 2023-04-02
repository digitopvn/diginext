import fetchApi from "../../src/modules/api/fetchApi";

export function checkSystemStatus() {
	it("System is up", async () => {
		// const { body: data } = await request.get("/api/v1/heathz").expect(200);
		// expect(data?.status).toEqual(1);
		const res = await fetchApi({ url: "/api/v1/healthz" });
		// console.log("res :>> ", res);
		expect(res.status).toBe(1);
	});
}
