import { logError } from "diginext-utils/dist/xconsole/log";

import { getCliConfig } from "@/config/config";
import type { InputOptions } from "@/interfaces";
import { getCurrentGitRepoData } from "@/plugins";

import { fetchApi } from "../api";

type ViewAppLogsOptions = {
	/**
	 * If `FALSE`, return logs of the first pod only.
	 * @default true
	 */
	allPods?: boolean;
};

export async function viewAppLogs(options: ViewAppLogsOptions & Pick<InputOptions, "targetDirectory" | "isDebugging" | "env">) {
	const { allPods = true, targetDirectory = process.cwd(), env = "dev" } = options;

	const { DB } = await import("@/modules/api/DB");

	const currentGitData = await getCurrentGitRepoData(targetDirectory);
	const app = await DB.findOne("app", { "git.repoSSH": currentGitData.repoSSH }, { populate: ["project", "owner", "workspace"] });
	if (!app) return logError(`App not found.`);

	if (options?.isDebugging) console.log("viewAppLogs() > app :>> ", app);

	try {
		const { buildServerUrl } = getCliConfig();
		const url = `${buildServerUrl}/api/v1/app/environment/logs?slug=${app.slug}&env=${env}`;
		if (options.isDebugging) console.log("viewAppLogs() > API url :>> ", url);
		const res = await fetchApi({ url });

		if (options.isDebugging) {
			console.log("viewAppLogs() > response :>> ");
			console.dir(res, { depth: 10 });
		}

		if (!res.status) throw new Error(res.messages[0] || `Unable to reach the API: ${url}.`);
		if (options?.isDebugging) console.log("requestResult.data :>> ", res.data);

		const logData = res.data;
		if (!logData) throw new Error(`No logs found.`);

		const podNames = logData.status?.toString() === "0" ? [] : Object.keys(logData);
		const firstPodName = podNames[0];
		const podLogs = firstPodName ? logData[firstPodName] : "";

		if (allPods) {
			podNames.map((podName) => console.log(logData[podName]));
		} else {
			console.log(podLogs);
		}
	} catch (e) {
		logError(`Unable to reach the API:`, e);
		return;
	}
}
