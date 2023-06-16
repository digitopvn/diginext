import inquirer from "inquirer";

import type { InputOptions } from "@/interfaces";

import createProjectByForm from "../project/create-project";
import { searchProjects } from "./search-projects";
//

export default async function selectProject(options?: InputOptions, canSkip: boolean = true) {
	//
	const projects = await searchProjects({ canSkip });

	// if empty array -> create new
	if (!projects || projects.length === 0) {
		const newProject = await createProjectByForm(options);
		options.project = newProject;
		return options.project;
	}

	// else -> display list to select:
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
