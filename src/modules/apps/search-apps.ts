import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { IApp } from "@/entities";

import { DB } from "../api/DB";

type SearchAppOptions = {
	projectSlug?: string;
	question?: string;
	/**
	 * @default true
	 */
	canSkip?: boolean;
};

export async function searchApps(options: SearchAppOptions) {
	const { projectSlug, question, canSkip = true } = options;

	const { keyword } = await inquirer.prompt({
		type: "input",
		name: "keyword",
		message: question ?? "Enter keyword (app's name) to search apps (leave empty to view all):",
	});

	// find/search apps
	const filter: any = {};
	filter.name = keyword;
	if (projectSlug) filter.projectSlug = projectSlug;

	let apps = await DB.find<IApp>("app", filter, { search: true }, { limit: 10 });

	if (isEmpty(apps)) {
		if (canSkip) {
			const { shouldSkip } = await inquirer.prompt<{ shouldSkip: boolean }>({
				name: "shouldSkip",
				type: "confirm",
				message: `Do you want to create new app instead?`,
				default: true,
			});
			if (shouldSkip) return [];
		}

		// if don't skip -> keep searching...
		apps = await searchApps({ ...options, question: `No apps found in "${projectSlug}" project. Try another keyword:` });
		return apps;
	} else {
		return apps;
	}
}
