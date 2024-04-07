import { logError, logWarn } from "diginext-utils/dist/xconsole/log";
import yargs from "yargs";

import type { ICluster } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";

import { fetchApi } from "../api";
import { askForCluster } from "../cluster/ask-for-cluster";
import { authCluster } from "../k8s/cluster-auth";

export const execCluster = async (options?: InputOptions) => {
	const { DB } = await import("@/modules/api/DB");
	const { secondAction: action, thirdAction: resource, isDebugging, author: owner, workspace } = options;

	switch (action) {
		case "connect":
			if (options.isDebugging) console.log("[CLUSTER] options.cluster :>> ", options.cluster);
			let cluster = options?.cluster
				? await DB.findOne("cluster", { slug: options.cluster }, { isDebugging: options.isDebugging })
				: await askForCluster();
			// if (options.isDebugging) console.log("[COMMAND] cluster > connect > cluster :>> ", cluster);
			if (!cluster) throw new Error(`Unable to connect cluster, cluster "${options?.cluster}" not found.`);

			// get cluster's credentials
			const { data, status, messages = [""] } = await fetchApi<ICluster>({ url: `/api/v1/cluster/credentials?id=${cluster._id}` });
			if (!data) throw new Error(`Unable to get cluster's credentials.`);
			cluster = data as ICluster;

			// execute cluster authentication
			await authCluster(cluster, { isDebugging, ownership: { owner, workspace } });
			break;

		case "list":
		case "ls":
			const clusters = await DB.find("cluster");
			if (!clusters || clusters.length === 0) throw new Error(`This workspace has no clusters.`);
			console.log(clusters.map((item, index) => `[${index + 1}] ${item.name} (${item.slug})`).join("\n"));
			break;

		case "get":
			// do something
			logWarn(`This feature is under development.`);
			break;

		case "set":
			switch (resource) {
				case "deploy":
				case "deployment":
					// do something
					logWarn(`This feature is under development.`);
					break;

				default:
					yargs.showHelp();
					break;
			}
			break;

		case "del":
		case "rm":
		case "delete":
			// do something
			logWarn(`This feature is under development.`);
			break;

		default:
			logError(`Action "${action}" in "${resource}" resource is invalid.`);
			break;
	}
};
