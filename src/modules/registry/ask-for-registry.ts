import { logError } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { IContainerRegistry } from "@/entities";

export const askForRegistry = async () => {
	const { DB } = await import("@/modules/api/DB");
	const registries = await DB.find("registry", {}, { subpath: "/all" });
	if (isEmpty(registries)) {
		logError(`There are no registered container registries in this workspace.`);
		return;
	}

	const { registry } = await inquirer.prompt<{ registry: IContainerRegistry }>({
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
