import { logWarn } from "diginext-utils/dist/console/log";
import { existsSync } from "fs";
import path from "path";

import type { InputOptions } from "../interfaces/InputOptions";

/**
 * Check if this project is a monorepo
 * @param {InputOptions} options
 * @returns {{error:string, appPath:string, appDirectory:string, isMonorepo:boolean}}
 */
function checkMonorepo(options?: InputOptions) {
	// * Check if this is a MONOREPO -> select app to deploy
	let message = "",
		isMonorepo = false,
		appPath = "",
		appDirectory = options.targetDirectory;

	if (existsSync(path.resolve(options.targetDirectory, "turbo.json"))) {
		if (!options.app) {
			message = `[ERROR] Monorepo -> không xác định được "app" để deploy`;
			logWarn(message);
			return { error: message };
		}
		appPath = `apps/${options.app}/`;
		appDirectory = path.resolve(appDirectory, appPath);
		isMonorepo = true;
	}

	return { appPath, appDirectory, isMonorepo };
}

export { checkMonorepo };
