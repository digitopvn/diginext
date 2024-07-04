import { logError } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import { Config } from "@/app.config";
import type { ICluster } from "@/entities";

import { DB } from "../api/DB";

export const askForNamespace = async (cluster: ICluster) => {
	const { contextName: context, isVerified } = cluster;
	if (!context || !isVerified) {
		logError(`This cluster hasn't been verified in DXUP system, please go to ${Config.DEFAULT_DX_SERVER_URL} to verify it.`);
		return;
	}

	const namespaces = await DB.find("monitor/namespaces", { cluster: cluster.slug });

	if (isEmpty(namespaces)) {
		logError(`This cluster (${cluster.slug}) doesn't have any namespaces.`);
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
