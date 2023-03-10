import { logError } from "diginext-utils/dist/console/log";
import yargs from "yargs";

import type InputOptions from "@/interfaces/InputOptions";

import { askForCluster } from "../cluster/ask-for-cluster";
import { authCluster } from "../k8s/cluster-auth";

export const execCluster = async (options?: InputOptions) => {
	const { secondAction: action, thirdAction: resource } = options;

	switch (action) {
		case "connect":
			const cluster = await askForCluster();
			if (!cluster) return;
			const { shortName } = cluster;
			try {
				await authCluster(shortName, { shouldSwitchContextToThisCluster: true });
			} catch (e) {
				logError(`[CLUSTER]`, e);
			}

			break;

		case "get":
			// do something
			break;

		case "set":
			switch (resource) {
				case "deploy":
				case "deployment":
					// do something
					break;

				default:
					yargs.showHelp();
					break;
			}
			break;

		case "del":
		case "delete":
			// do something
			break;

		default:
			logError(`Action "${action}" in "${resource}" resource is invalid.`);
			break;
	}
};
