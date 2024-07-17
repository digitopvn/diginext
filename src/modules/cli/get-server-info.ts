import axios from "axios";

import { getCliConfig } from "@/config/config";

export type ServerInfo = {
	version: string;
	location: string;
};

export async function getServerInfo(): Promise<ServerInfo> {
	try {
		const { buildServerUrl } = getCliConfig();
		const response = await axios.get(`${buildServerUrl}/api/v1/stats/version`);
		return response.data?.data;
	} catch (e) {
		console.error(`Unable to get server info: ${e}`);
		return { version: "Unknown", location: "Unknown" };
	}
}
