import chalk from "chalk";
import { logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import { writeFileSync } from "fs";
import path from "path";
import yargs from "yargs";

import { getCliConfig } from "@/config/config";
import type { InputOptions } from "@/interfaces";
import { getFolderStructure } from "@/plugins/fs-extra";

import { fetchApi } from "../api";

const { buildServerUrl } = getCliConfig();

export async function execAI(options?: InputOptions) {
	const { DB } = await import("@/modules/api/DB");
	const { secondAction: action, thirdAction: resource, isDebugging } = options;
	if (!options.targetDirectory) options.targetDirectory = process.cwd();

	switch (action) {
		case "generate":
			switch (resource) {
				case "dockerfile":
					try {
						const directoryStructure = await getFolderStructure(options.targetDirectory);
						const url = `/api/v1/ask-ai/generate/dockerfile`;
						if (options.isDebugging) console.log("execAI() > API url :>> ", url);

						const response = await fetchApi({ url, method: "POST", data: { directoryStructure } });

						if (options.isDebugging) {
							console.log("execAI() > result :>> ");
							console.dir(response, { depth: 10 });
						}

						if (!response.status) logError(response.messages[0] || `Unable to call Diginext API.`);
						if (options?.isDebugging) console.log("execAI() > requestResult.data :>> ", response.data);

						const dockerfileContent = response?.data;
						writeFileSync(path.resolve(options.targetDirectory, `Dockerfile.generated`), dockerfileContent, "utf8");

						// log success
						logSuccess(`Generate successfully: ${chalk.cyan("./Dockerfile.generated")}`);
					} catch (e) {
						logError(`Unable to call Diginext API:`, e);
						return;
					}
					break;

				default:
					yargs.showHelp();
					break;
			}
			break;

		default:
			logError(`Invalid CLI action: "${action}"`);
			break;
	}
}
