import { logError } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { ICloudStorage } from "@/entities";

export const askForStorage = async () => {
	const { DB } = await import("@/modules/api/DB");
	const list = await DB.find("storage", {});
	// console.log("list :>> ", list);
	if (isEmpty(list)) {
		logError(`This workspace doesn't have any cloud storages.`);
		return;
	}

	const { item } = await inquirer.prompt<{ item: ICloudStorage }>({
		name: "item",
		type: "list",
		message: `Select cloud storage:`,
		default: list[0],
		choices: list.map((c, i) => {
			return { name: `[${i + 1}] ${c.name} (${c.slug} / ${c.bucket} / ${c.provider})`, value: c };
		}),
	});

	return item;
};
