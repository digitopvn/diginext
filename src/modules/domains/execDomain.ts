import { logError, logWarn } from "diginext-utils/dist/console/log";
import yargs from "yargs";

import type InputOptions from "@/interfaces/InputOptions";

import { createRecordInDomain } from "../providers/digitalocean";

export const execDomain = async (options?: InputOptions) => {
	const { secondAction, name, input } = options;

	switch (secondAction) {
		case "new":
		case "add":
		case "create":
			if (!name) logError(`Subdomain "name" is required.`);
			if (!input) logError(`Subdomain "input" data (IP address) is required.`);
			try {
				await createRecordInDomain({
					name,
					data: input,
				});
			} catch (e) {
				logError(e);
			}
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
