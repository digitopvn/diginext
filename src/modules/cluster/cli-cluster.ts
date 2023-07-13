import { logError } from "diginext-utils/dist/xconsole/log";
import yargs from "yargs";

import type InputOptions from "@/interfaces/InputOptions";

import { askForCluster } from "../cluster/ask-for-cluster";
import { authCluster } from "../k8s/cluster-auth";

export const execCluster = async (options?: InputOptions) => {
	const { DB } = await import("@/modules/api/DB");
	const { secondAction: action, thirdAction: resource, isDebugging } = options;

	switch (action) {
		case "connect":
			// if (options.isDebugging) console.log("[CLUSTER] options.cluster :>> ", options.cluster);
			const cluster = options?.cluster ? await DB.findOne("cluster", { slug: options.cluster }) : await askForCluster();
			// if (options.isDebugging) console.log("[COMMAND] cluster > connect > cluster :>> ", cluster);
			if (!cluster) throw new Error(`Unable to connect cluster, cluster "${options?.cluster}" not found.`);
			await authCluster(cluster, { isDebugging });
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
