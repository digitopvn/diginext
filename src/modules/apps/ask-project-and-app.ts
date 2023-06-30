import inquirer from "inquirer";

import { isServerMode } from "@/app.config";
import type { IApp, IProject } from "@/entities";
import type { InputOptions } from "@/interfaces";
import { getAppConfig, getCurrentGitRepoData } from "@/plugins";

import { DB } from "../api/DB";
import { createOrSelectApp } from "./create-or-select-app";
import { createOrSelectProject } from "./create-or-select-project";

export const askForProjectAndApp = async (dir: string, options?: InputOptions) => {
	if (isServerMode) throw new Error(`Unable to use "askForProjectAndApp()" in SERVER mode.`);

	const currentGitData = await getCurrentGitRepoData(dir || options?.targetDirectory);

	if (options?.isDebugging) console.log("askForProjectAndApp() > currentGitData :>> ", currentGitData);

	let apps = await DB.find<IApp>("app", { "git.repoSSH": currentGitData.remoteSSH }, { populate: ["project", "owner", "workspace"] });
	let app: IApp;
	let project: IProject;

	// no apps found -> create or select one:
	if (!apps || apps.length === 0) {
		// try to find apps with deprecated "dx.json" file:
		const oldAppConfig = getAppConfig();
		if (oldAppConfig) {
			app = await DB.findOne<IApp>("app", { slug: oldAppConfig.slug }, { populate: ["project", "owner", "workspace"] });
			if (app) {
				project = await DB.findOne<IProject>("project", { slug: oldAppConfig.project });
				return { project, app };
			}
		}

		// if still no results -> create or select one:
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
