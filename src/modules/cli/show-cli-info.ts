import Table from "cli-table";

import { getCliConfig } from "@/config/config";
import type { InputOptions } from "@/interfaces";
import { getOS } from "@/plugins";

import { getServerInfo } from "./get-server-info";

export const showClientInfo = async (options: InputOptions) => {
	const { execa } = await import("execa");

	const { buildServerUrl, currentUser } = getCliConfig();

	const table = new Table();

	table.push(["OS", getOS().toUpperCase()]);
	table.push(["Node.js", (await execa("node", ["-v"])).stdout]);
	table.push(["NPM", (await execa("npm", ["-v"])).stdout]);
	// try {
	// 	table.push(["Docker", (await execa("docker", ["-v"])).stdout]);
	// } catch (e) {
	// 	table.push(["Docker", "N/A"]);
	// }
	// try {
	// 	table.push(["Podman", (await execa("podnan", ["-v"])).stdout]);
	// } catch (e) {
	// 	table.push(["Podman", "N/A"]);
	// }
	table.push(["Mode", process.env.CLI_MODE || "client"]);
	table.push(["Working dir", process.cwd()]);
	table.push(["CLI Version", options.version]);
	// table.push(["CLI Dir", CLI_DIR]);
	// table.push(["CLI Config", CLI_CONFIG_FILE]);
	table.push(["CLI User", currentUser ? `${currentUser.name} (${currentUser.slug})` : "N/A"]);
	table.push(["CLI UserID", currentUser ? `${currentUser._id}` : "N/A"]);

	const serverInfo = await getServerInfo();
	table.push(["Server URL", `${buildServerUrl}`]);
	table.push(["Server Version", serverInfo.version]);
	table.push(["Server Location", serverInfo.location]);

	console.log(table.toString());
};
