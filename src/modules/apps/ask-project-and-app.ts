import inquirer from "inquirer";
import { isEmpty } from "lodash";

import { isServerMode } from "@/app.config";
import type { IApp, IProject } from "@/entities";
import type { InputOptions } from "@/interfaces";
import { getAppConfig, getCurrentGitRepoData } from "@/plugins";

import { createOrSelectApp } from "./create-or-select-app";
import { createOrSelectProject } from "./create-or-select-project";

export const askForProjectAndApp = async (dir: string, options?: InputOptions) => {
	const { DB } = await import("../api/DB");

	if (isServerMode) throw new Error(`Unable to use "askForProjectAndApp()" in SERVER mode.`);

	const currentGitData = await getCurrentGitRepoData(dir || options?.targetDirectory);

	if (options?.isDebugging) console.log("askForProjectAndApp() > currentGitData :>> ", currentGitData);

	let apps = await DB.find(
		"app",
		{ "git.repoSSH": currentGitData.repoSSH },
		{ populate: ["project", "owner", "workspace"], isDebugging: options?.isDebugging }
	);

	let app: IApp;
	let project: IProject;

	// no apps found -> create or select one:
	if (isEmpty(apps)) {
		// try to find apps with deprecated "dx.json" file:
		const oldAppConfig = getAppConfig();
		if (oldAppConfig) {
			app = await DB.findOne("app", { slug: oldAppConfig.slug }, { populate: ["project", "owner", "workspace"], ignorable: true });
			if (app) {
				project = await DB.findOne("project", { slug: oldAppConfig.project }, { ignorable: true });
				if (!isEmpty(project)) return { project, app };
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
		project = isEmpty(app.project) ? await createOrSelectProject(options) : (app.project as IProject);
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
