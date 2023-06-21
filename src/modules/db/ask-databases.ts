import { logError } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { ICloudDatabase } from "@/entities";

import { DB } from "../api/DB";

export async function askForDatabase() {
	const dbs = await DB.find<ICloudDatabase>("database", {});

	if (isEmpty(dbs)) {
		logError(`No cloud databases found.`);
		return;
	}

	const dbChoices = dbs.map((gp) => {
		return { name: gp.name, value: gp };
	});

	const { db } = await inquirer.prompt<{ db: ICloudDatabase }>({
		type: "list",
		name: "db",
		message: "Select database:",
		default: dbChoices[0],
		choices: dbChoices,
	});

	return db;
}
