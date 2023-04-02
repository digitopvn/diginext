import { User } from "../src/entities";
import fetchApi from "../src/modules/api/fetchApi";

const user = new User({ name: "Test User 1" });

describe("Test suite", () => {
	beforeAll(async () => {
		//
	});

	afterAll(async () => {
		//
	});

	// API
	it("system is up", async () => {
		// const { body: data } = await request.get("/api/v1/heathz").expect(200);
		// expect(data?.status).toEqual(1);
		const res = await fetchApi({ url: "/api/v1/healthz" });
		console.log("res :>> ", res);
		expect(res.status).toBe(1);
	});
});

// nothing
export {};
