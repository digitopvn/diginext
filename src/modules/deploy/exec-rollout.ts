import { log, logError, logWarn } from "diginext-utils/dist/console/log";
import inquirer from "inquirer";
import { isEmpty } from "lodash";

import type { Release } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";
import { getAppConfig } from "@/plugins";

import fetchApi from "../api/fetchApi";
import ClusterManager from "../k8s";

export const execRollOut = async (options?: InputOptions) => {
	const { secondAction, targetDirectory } = options;

	let releaseId = secondAction;

	if (!releaseId) {
		logWarn(`Release ID is required, for example: "dx rollout <release-id>", trying to get some latest releases of this app...`);

		const appConfig = getAppConfig(targetDirectory);

		if (!appConfig) {
			logError(`Not found "dx.json" in the directory. Try: "dx rollout --dir=/path/to/dir"`);
			return;
		}

		const { project, slug } = appConfig;

		log(`Looking for some latest releases of this app (${project}/${slug})...`);
		const releaseURL = `/api/v1/release?sort=-createdAt&limit=5&active=false&projectSlug=${project}&appSlug=${slug}`;
		const { data } = await fetchApi<Release>({ url: releaseURL });
		const latestReleases = data as Release[];
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
				return { name: `${p.slug} (created by "${p.createdBy}")`, value: p._id.toString() };
			}),
		});

		releaseId = selectedId;
	}

	await ClusterManager.rollout(releaseId);
};
