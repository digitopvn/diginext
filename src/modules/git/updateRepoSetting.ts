import axios from "axios";
import { logWarn } from "diginext-utils/dist/xconsole/log";

import type { InputOptions } from "@/interfaces";

export default async function updateRepoSetting(options: InputOptions) {
	//
	// https://api.github.com/repos/OWNER/REPO/branches/BRANCH/protection \

	// console.log("options :>> ", options);
	// console.log("options.git :>> ", options.git);
	// console.log("options.git?.type :>> ", options.git?.type);

	const type = options.git?.type || options.app.git.provider;
	switch (type) {
		case "github":
			{
				const token = options.git?.access_token;
				const owner = options.git?.org;
				const repo = options.repoSlug;

				try {
					// repos/OWNER/REPO
					const res = await axios({
						method: "PATCH",
						url: `https://api.github.com/repos/${owner}/${repo}`,
						headers: {
							"X-GitHub-Api-Version": "2022-11-28",
							Accept: "application/vnd.github+json",
							Authorization: `token ${token}`,
							//
						},
						data: {
							allow_auto_merge: true,
						},
					});
					// if (options.isDebugging) log("res Update main branch protection :>> ", res?.statusText);
					if (options.isDebugging) console.log("Update main branch protection :>> ", res?.statusText);
				} catch (error) {
					if (error?.response) {
						// The request was made and the server responded with a status code outside of the 2xx range
						if (error?.response?.data?.message) logWarn(error?.response?.data?.message);

						if (options.isDebugging) {
							console.log("[UPDATE_REPO_SETTING] URL:>> ", `https://api.github.com/repos/${owner}/${repo}`);
							console.log("[UPDATE_REPO_SETTING] ==> error?.response?.data\n", error?.response?.data);
							console.log("[UPDATE_REPO_SETTING] ==> error?.response?.status\n", error?.response?.status);
							console.log("[UPDATE_REPO_SETTING] ==> error?.response?.headers\n", error?.response?.headers);
						}
					} else if (error?.request) {
						// The request was made but no response was received
						if (options.isDebugging) console.log("[UPDATE_REPO_SETTING] Error:\n", error?.request);
					} else {
						// Something happened in setting up the request that triggered an Error
						if (options.isDebugging) console.log("[UPDATE_REPO_SETTING] Error:\n", error?.message);
					}
				}
			}

			break;

		case "bitbucket":
			break;

		default:
			break;
	}
}

export { updateRepoSetting };
