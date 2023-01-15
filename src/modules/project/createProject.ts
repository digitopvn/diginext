import { logError } from "diginext-utils/dist/console/log";
import { makeSlug } from "diginext-utils/dist/Slug";
import inquirer from "inquirer";

import type Project from "@/entities/Project";
import type { InputOptions } from "@/interfaces/InputOptions";
import fetchApi from "@/modules/api/fetchApi";

export async function askProjectQuestions(options?: InputOptions) {
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
	options.projectSlug = makeSlug(options.projectName);

	return options;
}

/**
 * Create new project & children app with pre-setup: git, cli, deployment,...
 */
export default async function createProject(options: InputOptions) {
	// create project form:
	await askProjectQuestions(options);

	// Save this project to database
	const { status, data, messages } = await fetchApi<Project>({
		url: `/api/v1/project`,
		method: "POST",
		data: {
			name: options.projectName,
			createdBy: options.username,
			owner: options.userId,
			workspace: options.workspaceId,
		},
	});

	if (!status) logError(messages);

	const newProject = data as Project;

	options.project = newProject;
	options.projectSlug = newProject.slug;

	return newProject;
}
