import inquirer from "inquirer";

import type { InputOptions } from "@/interfaces";
import selectProject from "@/modules/apps/selectProject";

import createProjectByForm from "../project/create-project";

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
			const project = await selectProject(options);
			options.project = project;
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
