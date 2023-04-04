import { logError, logWarn } from "diginext-utils/dist/console/log";
import yargs from "yargs";

import type InputOptions from "@/interfaces/InputOptions";

/**
 * Take down the whole project & all of its apps
 * @example
 * dx down project
 * @param  {InputOptions} options
 */
export const takedownProject = async (options?: InputOptions) => {
	// TODO: Implement take down an app from a cluster
};

/**
 * Take down the whole app & all of its environments
 * @example
 * dx down app
 * dx down app <app-slug>
 * @param  {InputOptions} options
 */
export const takedownApp = async (options?: InputOptions) => {
	// TODO: Implement take down an app from a cluster
};

/**
 * Take down the whole app & all of its environments
 * @example
 * dx down
 * dx down --prod
 * dx down --env=canary
 * @param  {InputOptions} options
 */
export const takedownEnvironment = async (options?: InputOptions) => {
	// TODO: Implement take down an app from a cluster
};

export async function execTakeDown(options?: InputOptions) {
	// TODO: implement take down app deployment
	const { secondAction, name, input } = options;

	switch (secondAction) {
		// take down the whole project & all of its apps
		case "project":
			try {
				logWarn(`This feature is under development`);
			} catch (e) {
				logError(e);
			}
			break;

		// take down the whole app & all of its environments
		case "app":
			try {
				logWarn(`This feature is under development`);
			} catch (e) {
				logError(e);
			}
			break;

		// take down a specific environment:
		case undefined:
			try {
				logWarn(`This feature is under development`);
			} catch (e) {
				logError(e);
			}
			break;

		// show help
		default:
			yargs.showHelp();
			break;
	}
}
