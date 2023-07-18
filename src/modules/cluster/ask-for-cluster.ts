import { logError } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { ICluster } from "@/entities";

export const askForCluster = async () => {
	const { DB } = await import("@/modules/api/DB");
	const clusters = await DB.find("cluster", {});

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
			return { name: `[${i + 1}] ${c.name} (${c.slug} / ${c.providerShortName})`, value: c };
		}),
	});

	return cluster;
};
