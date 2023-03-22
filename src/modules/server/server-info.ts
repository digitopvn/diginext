import Table from "cli-table";
import execa from "execa";

import { getCliConfig } from "@/config/config";
import { CLI_CONFIG_FILE, CLI_DIR } from "@/config/const";
import type { InputOptions } from "@/interfaces";
import { getOS } from "@/plugins";

export const showServerInfo = async (options: InputOptions) => {
	const { buildServerUrl } = getCliConfig();

	const table = new Table();

	table.push(["OS", getOS().toUpperCase()]);
	table.push(["Node", (await execa("node", ["-v"])).stdout]);
	table.push(["NPM", (await execa("npm", ["-v"])).stdout]);
	table.push(["Docker", (await execa("docker", ["-v"])).stdout]);
	table.push(["Mode", process.env.CLI_MODE || "client"]);
	table.push(["Working dir", process.cwd()]);
	table.push(["CLI Version", options.version]);
	table.push(["CLI Dir", CLI_DIR]);
	table.push(["CLI Config", CLI_CONFIG_FILE]);
	table.push(["Server URL", buildServerUrl]);

	console.log(table.toString());
};
