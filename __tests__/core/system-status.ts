import axios from "axios";
import { Config } from "@/app.config";

export function checkSystemStatus() {
	it("System is up", async () => {
		const { data: res } = await axios.get(`http://localhost:${Config.PORT}/api/v1/healthz`);
		expect(res.status).toBe(1);
	});
}
