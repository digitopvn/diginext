import inquirer from "inquirer";

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
	let projects = await DB.find("project", filter, { search: true, order: { updatedAt: -1, createdAt: -1 } }, { limit: 20 });

	if (!projects || projects.length === 0) {
		if (canSkip) {
			const { shouldCreateNew } = await inquirer.prompt<{ shouldCreateNew: boolean }>({
				name: "shouldCreateNew",
				type: "confirm",
				message: `Do you want to create new project instead?`,
				default: true,
			});

			if (shouldCreateNew) return [];
		}
		// if don't create new -> keep searching...
		projects = await searchProjects({ ...options, question: `No projects found. Try another keyword:` });
		return projects;
	} else {
		return projects;
	}
}
