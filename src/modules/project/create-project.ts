import { logError } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";

import type Project from "@/entities/Project";
import type { InputOptions } from "@/interfaces/InputOptions";

import { DB } from "../api/DB";

export async function askCreateProjectQuestions(options?: InputOptions) {
	const project = {} as Project;

	if (!options.projectName) {
		const { projectName } = await inquirer.prompt({
			type: "input",
			name: "projectName",
			message: "Enter your project name:",
			validate: function (value) {
				if (value.length > 3) {
					return true;
				} else {
					return "Project name is required & contains more than 3 characters.";
				}
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
	// create project form:
	const newProjectData = await askCreateProjectQuestions(options);

	// Save this project to database
	const newProject = await DB.create<Project>("project", newProjectData);
	if (!newProject) {
		logError(`Failed to create new project named "${newProjectData.name}"`);
		return;
	}

	console.log("createProjectByForm > newProject :>> ", newProject);

	options.project = newProject;
	options.projectName = newProject.name;
	options.projectSlug = newProject.slug;

	return newProject;
}
