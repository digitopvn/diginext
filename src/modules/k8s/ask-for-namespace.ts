import { logError } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { ICluster } from "@/entities";

import ClusterManager from ".";

export const askForNamespace = async (cluster: ICluster) => {
	const { contextName: context } = cluster;
	if (!context) {
		logError(`This cluster hasn't been authenticated.`);
		return;
	}

	const namespaces = await ClusterManager.getAllNamespaces({ context });

	if (isEmpty(namespaces)) {
		logError(`This cluster (${cluster.shortName}) doesn't have any namespaces.`);
		return;
	}

	const { namespace } = await inquirer.prompt<{ namespace: string }>({
		name: "namespace",
		type: "list",
		message: `Select namespace:`,
		default: namespaces[0],
		choices: namespaces.map((c, i) => {
			return { name: `[${i + 1}] ${c.metadata.name}`, value: c.metadata.name };
		}),
	});

	return namespace;
};
