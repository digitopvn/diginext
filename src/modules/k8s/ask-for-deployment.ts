import { logError } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { ICluster } from "@/entities";

import ClusterManager from ".";

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

	const deployments = await ClusterManager.getAllDeploys(namespace, { context });

	if (isEmpty(deployments)) {
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
