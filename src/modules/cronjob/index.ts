import { logWarn } from "diginext-utils/dist/xconsole/log";
import yargs from "yargs";

import type { ICronjob } from "@/entities/Cronjob";

import type { InputOptions } from "../../interfaces/InputOptions";

/**
 * Sub-commands of `dx cronjob`
 */
export async function execCronjob(options: InputOptions) {
	logWarn(`This feature is under development.`);
	const { secondAction, targetDirectory } = options;

	let cronjob: ICronjob;

	switch (secondAction) {
		case "healthz":
			//...
			break;

		case "backup":
			//...
			break;

		case "restore":
			//...
			break;

		default:
			yargs.showHelp();
	}
}
