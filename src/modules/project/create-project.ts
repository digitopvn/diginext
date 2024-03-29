import inquirer from "inquirer";

import type { IProject } from "@/entities/Project";
import type { InputOptions } from "@/interfaces/InputOptions";
import { containsSpecialCharacters } from "@/plugins/string";

export async function askCreateProjectQuestions(options?: InputOptions) {
	const project = {} as IProject;

	if (!options.projectName) {
		const { projectName } = await inquirer.prompt({
			type: "input",
			name: "projectName",
			message: "Enter your project name:",
			validate: function (value) {
				if (value.length <= 3) return "Project name is required & contains more than 3 characters.";
				if (containsSpecialCharacters(value)) return `Project name should not contain special characters.`;
				return true;
			},
		});
		options.projectName = projectName;
	}

	project.name = options.projectName;

	// ownership
	if (options.username) project.createdBy = options.username;
	if (options.userId) project.owner = options.userId;
	if (options.workspaceId) project.workspace = options.workspaceId;

	return project;
}

/**
 * Create new project & children app with pre-setup: git, cli, deployment,...
 */
export default async function createProjectByForm(options: InputOptions) {
	const { DB } = await import("@/modules/api/DB");
	// create project form:
	const newProjectData = await askCreateProjectQuestions(options);

	// Save this project to database
	const newProject = await DB.create("project", newProjectData);
	if (options.isDebugging) console.log("[createProjectByForm] newProject :>> ", newProject);
	if (!newProject) return;

	// console.log("createProjectByForm > newProject :>> ", newProject);

	options.project = newProject;
	options.projectName = newProject.name;
	options.projectSlug = newProject.slug;

	return newProject;
}
