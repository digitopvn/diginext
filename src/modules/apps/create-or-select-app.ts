import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { IApp, IGitProvider } from "@/entities";
import type { InputOptions } from "@/interfaces";
import { getCurrentGitRepoData } from "@/plugins";
import { makeSlug } from "@/plugins/slug";

import { DB } from "../api/DB";
import { askForGitProvider } from "../git/ask-for-git-provider";
import { createAppByForm } from "./new-app-by-form";
import { searchApps } from "./search-apps";
import { updateAppGitInfo } from "./update-git-config";

export async function createOrSelectApp(projectSlug: string, options: InputOptions, question?: string) {
	const { action } = await inquirer.prompt({
		type: "list",
		name: "action",
		message: question || `Create new or select an existing app?`,
		choices: [
			{ name: "Create new app", value: "create" },
			{ name: "Select existing app", value: "select" },
		],
	});

	let app: IApp;
	if (action === "select") {
		// find/search projects
		const apps = await searchApps({ projectSlug });

		if (!isEmpty(apps)) {
			// display list to select:
			const { selectedApp } = await inquirer.prompt<{ selectedApp: IApp }>({
				type: "list",
				name: "selectedApp",
				message: `Select your app in "${projectSlug}" project:`,
				choices: apps.map((_app, i) => {
					return { name: `[${i + 1}] ${_app.name} (${_app.slug})`, value: _app };
				}),
			});

			// [backward compatible <3.15.X] apps have no git provider id -> update one!
			options.git = selectedApp.gitProvider
				? await DB.findOne<IGitProvider>("git", { _id: selectedApp.gitProvider })
				: await askForGitProvider();
			if (!selectedApp.gitProvider && options.git) await DB.updateOne<IApp>("app", { _id: selectedApp._id }, { gitProvider: options.git._id });

			// [backward compatible <3.15.X] apps have no "public" field -> update them follows their gitProvider's "public" field
			if (selectedApp.public !== options.git.public) {
				selectedApp.public = options.git.public;
				await DB.updateOne("app", { _id: selectedApp._id }, { public: selectedApp.public });
			}

			// select this app!
			app = selectedApp;
		} else {
			app = await createAppByForm({ ...options, skipFramework: true });
		}
	} else {
		app = await createAppByForm({ ...options, skipFramework: true });
	}

	if (!app) return;

	options.app = app;
	options.slug = app.slug;
	options.name = app.name;
	options.repoSlug = `${makeSlug(projectSlug)}-${makeSlug(options.name)}`.toLowerCase();

	// If there are no git info of this app in database, try to fetch current git data:
	if (!app.git) {
		const gitInfo = await getCurrentGitRepoData(options.targetDirectory);
		if (options.isDebugging) console.log(`[CREATE_OR_SELECT_APP] try to fetch current git data :>>`, gitInfo);

		if (!gitInfo) throw new Error(`[CREATE_OR_SELECT_APP] This directory has no git remote integrated.`);

		app = await updateAppGitInfo(app, {
			provider: gitInfo.provider,
			repoURL: gitInfo.repoURL,
			repoSSH: gitInfo.repoSSH,
		});

		if (!app) throw new Error(`[CREATE_OR_SELECT_APP] Failed to update new git info to this app (${options.slug} / ${projectSlug}).`);
	}

	options.repoSSH = app.git.repoSSH;
	options.repoURL = app.git.repoURL;
	options.gitProvider = app.git.provider;
	options.repoURL = options.repoURL;

	return app;
}
