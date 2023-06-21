import { logError } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";

import type { ICluster } from "@/entities";

import ClusterManager from "./index";

export const askForDeployment = async (cluster: ICluster, namespace: string = "default") => {
	const { contextName: context } = cluster;
	if (!context) {
		logError(`This cluster hasn't been authenticated.`);
		return;
	}

	if (!namespace) {
		logError(`Namespace 'name' is required.`);
		return;
	}

	const deployments = await ClusterManager.getDeploys(namespace, { context });

	if (!deployments || deployments.length === 0) {
		logError(`This namespace (${namespace}) doesn't have any deployments.`);
		return;
	}

	const { deployment } = await inquirer.prompt<{ deployment: string }>({
		name: "deployment",
		type: "list",
		message: `Select deployment:`,
		default: deployments[0],
		choices: deployments.map((c, i) => {
			return { name: `[${i + 1}] ${c.metadata.name}`, value: c.metadata.name };
		}),
	});

	return deployment;
};
