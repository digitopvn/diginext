import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type Project from "@/entities/Project";

import { DB } from "../api/DB";

type SearchAppOptions = {
	question?: string;
	/**
	 * @default true
	 */
	canSkip?: boolean;
};

export async function searchProjects(options: SearchAppOptions = {}) {
	const { question, canSkip = true } = options;

	const { keyword } = await inquirer.prompt<{ keyword: string }>({
		type: "input",
		name: "keyword",
		message: question ?? "Enter keyword to search projects (leave empty to get recent projects):",
	});

	// find/search projects
	const filter = keyword ? { name: keyword } : {};
	let projects = await DB.find<Project>("project", filter, { search: true, order: { updatedAt: -1, createdAt: -1 } }, { limit: 20 });

	if (isEmpty(projects)) {
		if (canSkip) {
			const { shouldSkip } = await inquirer.prompt<{ shouldSkip: boolean }>({
				name: "shouldSkip",
				type: "confirm",
				message: `Do you want to create new project instead?`,
				default: true,
			});
			if (shouldSkip) return [];
		}
		// if don't skip -> keep searching...
		projects = await searchProjects({ ...options, question: `No projects found. Try another keyword:` });
		return projects;
	} else {
		return projects;
	}
}
