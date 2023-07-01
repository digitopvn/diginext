import inquirer from "inquirer";

import type { IProject } from "@/entities";
import type { InputOptions } from "@/interfaces";
import selectProject from "@/modules/apps/selectProject";

import { DB } from "../api/DB";
import createProjectByForm from "../project/create-project";

export async function createOrSelectProject(options?: InputOptions) {
	// if the user provide project name -> create new project immediately
	if (options.projectName) {
		const newProject = await DB.create<IProject>("project", { name: options.projectName });
		options.project = newProject;
	}

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
