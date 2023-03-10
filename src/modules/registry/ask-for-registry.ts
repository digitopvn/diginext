import { logError } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { ContainerRegistry } from "@/entities";

import { DB } from "../api/DB";

export const askForRegistry = async () => {
	const registries = await DB.find<ContainerRegistry>("registry", {});
	if (isEmpty(registries)) {
		logError(`There are no registered container registries in this workspace.`);
		return;
	}

	const { registry } = await inquirer.prompt<{ registry: ContainerRegistry }>({
		name: "registry",
		type: "list",
		message: "Select container registry:",
		default: registries[0],
		choices: registries.map((c, i) => {
			return { name: `[${i + 1}] ${c.name} (${c.provider})`, value: c };
		}),
	});

	return registry;
};
