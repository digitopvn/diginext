import { logError, logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import yargs from "yargs";

import type InputOptions from "@/interfaces/InputOptions";

import { dxCreateDomain } from "../diginext/dx-domain";

const logTitle = `[EXEC_DOMAIN]`;

export const execDomain = async (options?: InputOptions) => {
	const { secondAction, name, input } = options;

	switch (secondAction) {
		case "new":
		case "add":
		case "create":
			if (!name) {
				logError(`Subdomain "name" is required.`);
				return;
			}
			if (!input) {
				logError(`Subdomain "input" data (IP address) is required.`);
				return;
			}
			if (!options.workspace.dx_key) {
				logError(`Missing "DX Key" in this workspace.`);
				return;
			}
			const { status, messages, data } = await dxCreateDomain({ name, data: input }, options.workspace.dx_key);
			if (status === 0) {
				logError(logTitle, messages.join(". "));
				return;
			}
			logSuccess(logTitle, `Created domain "${data.domain}" successfully.`);
			break;

		case "delete":
			try {
				logWarn(`This feature is under development`);
			} catch (e) {
				logError(e);
			}
			break;

		case "list":
		case "ls":
			try {
				logWarn(`This feature is under development`);
			} catch (e) {
				logError(e);
			}
			break;

		case "update":
		case "modify":
		case "change":
			try {
				logWarn(`This feature is under development`);
			} catch (e) {
				logError(e);
			}
			break;
		default:
			yargs.showHelp();
			break;
	}
};
