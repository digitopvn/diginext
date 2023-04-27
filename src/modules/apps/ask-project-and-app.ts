import inquirer from "inquirer";

import { isServerMode } from "@/app.config";
import type { IApp, IProject } from "@/entities";
import type { InputOptions } from "@/interfaces";
import { getCurrentGitRepoData } from "@/plugins";

import { DB } from "../api/DB";
import { createOrSelectApp } from "./create-or-select-app";
import { createOrSelectProject } from "./create-or-select-project";

export const askForProjectAndApp = async (dir: string, options?: InputOptions) => {
	if (isServerMode) throw new Error(`Unable to use "askForProjectAndApp()" in SERVER mode.`);

	const currentGitData = await getCurrentGitRepoData(dir || options.targetDirectory);

	let apps = await DB.find<IApp>("app", { "git.repoURL": currentGitData.remoteURL }, { populate: ["project", "owner", "workspace"] });
	let app: IApp;
	let project: IProject;

	// if there are only 1 app with this git repo -> select it:
	if (!apps || apps.length === 0) {
		if (isServerMode) throw new Error(`No project/app found, unable to process.`);

		project = await createOrSelectProject(options);
		app = await createOrSelectApp(project.slug, options);
		return { project, app };
	}

	// if there are only 1 app with this git repo -> select it:
	if (!apps || apps.length === 1) {
		app = apps[0];
		project = app.project as IProject;
		return { project, app };
	}

	if (isServerMode) {
		throw new Error(`There are more than 1 apps using the same git repository.`);
	}

	// if there are more than 1 app with this git repo -> select one:
	const { selectedApp } = await inquirer.prompt<{ selectedApp: IApp }>({
		type: "list",
		name: "selectedApp",
		message: `Select app:`,
		default: apps[0],
		choices: apps.map((_app, i) => {
			return { name: `[${i + 1}] ${_app.name} (${_app.slug})`, value: _app };
		}),
	});

	app = selectedApp;
	project = app.project as IProject;

	return { project, app };
};
