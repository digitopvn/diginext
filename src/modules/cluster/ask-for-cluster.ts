import { logError } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { Cluster } from "@/entities";

import { DB } from "../api/DB";

export const askForCluster = async () => {
	const clusters = await DB.find<Cluster>("cluster", {});

	if (isEmpty(clusters)) {
		logError(`This workspace doesn't have any clusters.`);
		return;
	}

	const { cluster } = await inquirer.prompt<{ cluster: Cluster }>({
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
