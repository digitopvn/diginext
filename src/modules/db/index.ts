import { logWarn } from "diginext-utils/dist/xconsole/log";

import type { InputOptions } from "../../interfaces/InputOptions";

// TODO: Add/edit/delete cloud database

/**
 *
 * @param {InputOptions} options
 * @param {InputOptions.env} env
 * @returns {InputOptions}
 */
export async function execDatabase(options: InputOptions, env) {
	logWarn(`This feature is under development.`);
}
