import inquirer from "inquirer";

import type { InputOptions } from "@/interfaces";

import { searchProjects } from "./search-projects";
//

export default async function selectProject(options?: InputOptions, canSkip: boolean = true) {
	//
	const projects = await searchProjects({ canSkip });

	// display list to select:
	const { selectedProject } = await inquirer.prompt({
		type: "list",
		name: "selectedProject",
		message: "Select your project:",
		choices: projects.map((p, i) => {
			return { name: `[${i + 1}] ${p.name} (${p.slug})`, value: p };
		}),
	});
	options.project = selectedProject;

	return options.project;
}
