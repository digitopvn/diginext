import inquirer from "inquirer";

import type { InputOptions } from "@/interfaces";

import createProjectByForm from "../project/create-project";
import { searchProjects } from "./search-projects";

export async function createOrSelectProject(options?: InputOptions) {
	if (!options.project) {
		const { projectSlug } = options;

		const { action } = await inquirer.prompt<{ action: "select" | "create" }>({
			type: "list",
			name: "action",
			message: projectSlug
				? `Project "${projectSlug}" not found or might be deleted, what do want to do?`
				: `Create new or select an existing project?`,
			choices: [
				{ name: "Create new project", value: "create" },
				{ name: "Select existing project", value: "select" },
			],
		});

		if (action === "select") {
			// find/search projects
			const projects = await searchProjects();

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
		} else {
			const newProject = await createProjectByForm(options);
			options.project = newProject;
		}
	}

	options.projectSlug = options.project.slug;
	options.projectName = options.project.name;
	options.namespace = `${options.project.slug}-${options.env || "dev"}`;

	return options.project;
}
