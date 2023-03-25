import { logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import yargs from "yargs";

import type InputOptions from "@/interfaces/InputOptions";

import { createDiginextDomain } from "../diginext/dx-domain";

const logTitle = `[EXEC_DOMAIN]`;

export const execDomain = async (options?: InputOptions) => {
	const { secondAction, name, input } = options;

	switch (secondAction) {
		case "new":
		case "add":
		case "create":
			if (!name) logError(`Subdomain "name" is required.`);
			if (!input) logError(`Subdomain "input" data (IP address) is required.`);
			const { status, messages, data } = await createDiginextDomain({ name, data: input });
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
