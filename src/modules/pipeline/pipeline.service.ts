import { logWarn } from "diginext-utils/dist/console/log";

import type { InputOptions } from "@/interfaces/InputOptions";

/**
 * @param  {InputOptions} options
 * @deprecated
 */
export function generatePipeline(options: InputOptions) {
	logWarn(`[Deprecated] Deploy bằng Bitbucket Pipelines sẽ bị loại bỏ trong tương lai.`);
	return options;
}

/**
 * @param  {String[]} commands
 * @param  {InputOptions} options
 * @deprecated
 */
export async function startPipeline(commands: string[], options: InputOptions) {
	logWarn(`Deprecated.`);
	return true;
}
