import axios from "axios";
import fetchApi from "../../src/modules/api/fetchApi";

export function checkSystemStatus() {
	it("System is up", async () => {
		const { data: res } = await axios.get("http://localhost:6969/api/v1/healthz");
		console.log("res :>> ", res);
		expect(res.status).toBe(1);
	});
}
