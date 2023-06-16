import { logError } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { ICluster } from "@/entities";

import { DB } from "../api/DB";

export const askForCluster = async () => {
	const clusters = await DB.find<ICluster>("cluster", {});

	if (isEmpty(clusters)) {
		logError(`This workspace doesn't have any clusters.`);
		return;
	}

	const { cluster } = await inquirer.prompt<{ cluster: ICluster }>({
		name: "cluster",
		type: "list",
		message: `Select cluster:`,
		default: clusters[0],
		choices: clusters.map((c, i) => {
			return { name: `[${i + 1}] ${c.name} (${c.shortName} / ${c.providerShortName})`, value: c };
		}),
	});

	return cluster;
};
