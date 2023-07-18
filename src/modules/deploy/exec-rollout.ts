import { log, logError, logWarn } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { IRelease } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";
import { MongoDB } from "@/plugins/mongodb";

import fetchApi from "../api/fetchApi";
import { getAppConfigFromApp } from "../apps/app-helper";
import { askForProjectAndApp } from "../apps/ask-project-and-app";
import ClusterManager from "../k8s";

export const execRollOut = async (options?: InputOptions) => {
	const { secondAction, targetDirectory } = options;

	let releaseId = secondAction;

	if (!releaseId) {
		logWarn(`Release ID is required, for example: "dx rollout <release-id>", trying to get some latest releases of this app...`);

		const { app } = await askForProjectAndApp(options.targetDirectory, options);
		const appConfig = getAppConfigFromApp(app);

		if (!appConfig) {
			logError(`Not found deploy environment config on Diginext workspace.`);
			return;
		}

		const { project, slug } = appConfig;

		log(`Looking for some latest releases of this app (${project}/${slug})...`);
		const releaseURL = `/api/v1/release?sort=-createdAt&limit=5&active=false&projectSlug=${project}&appSlug=${slug}`;
		const { data } = await fetchApi({ url: releaseURL });
		const latestReleases = data as IRelease[];
		// log({ data });

		if (isEmpty(latestReleases)) {
			logError(`No available releases for this app.`);
			return;
		}

		const { selectedId } = await inquirer.prompt({
			name: "selectedId",
			type: "list",
			message: "Select your release to roll out:",
			choices: latestReleases.map((p) => {
				return { name: `${p.slug} (created by "${p.createdBy}")`, value: MongoDB.toString(p._id) };
			}),
		});

		releaseId = selectedId;
	}

	await ClusterManager.rollout(releaseId);
};
