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

	const { keyword } = await inquirer.prompt({
		type: "input",
		name: "keyword",
		message: question ?? "Enter keyword to search projects (leave empty to get recent projects):",
	});

	// find/search projects
	let projects = await DB.find<Project>(
		"project",
		{ name: keyword },
		{ search: true, order: { updatedAt: "DESC", createdAt: "DESC" } },
		{ limit: 10 }
	);

	if (isEmpty(projects)) {
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
		projects = await searchProjects({ ...options, question: `No projects found. Try another keyword:` });
		return projects;
	} else {
		return projects;
	}
}
