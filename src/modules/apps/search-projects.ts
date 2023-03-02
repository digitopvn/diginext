import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type Project from "@/entities/Project";

import { DB } from "../api/DB";

export async function searchProjects(question?: string) {
	const { keyword } = await inquirer.prompt({
		type: "input",
		name: "keyword",
		message: question ?? "Enter keyword to search projects (leave empty to get recent projects):",
	});

	// find/search projects
	let projects = await DB.find<Project>("project", { name: keyword }, { search: true }, { limit: 10 });

	if (isEmpty(projects)) {
		projects = await searchProjects(`No projects found. Try another keyword:`);
		return projects;
	} else {
		return projects;
	}
}
