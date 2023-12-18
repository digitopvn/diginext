import axios from "axios";
import { logWarn } from "diginext-utils/dist/xconsole/log";

import type { InputOptions } from "@/interfaces";

export default async function updateBranchProtection(options: InputOptions) {
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
				const branch = (options as any).defaultBranch || "main";

				try {
					const res = await axios({
						method: "put",
						url: `https://api.github.com/repos/${owner}/${repo}/branches/${branch}/protection`,
						headers: {
							Accept: "application/vnd.github+json",
							Authorization: `token ${token}`,
							//
						},
						data: {
							required_status_checks: null,
							enforce_admins: null,
							required_pull_request_reviews: {
								dismiss_stale_reviews: false,
								require_code_owner_reviews: false,
								required_approving_review_count: 0,
								require_last_push_approval: null,
							},
							restrictions: null,
							required_linear_history: null,
							allow_force_pushes: true,
							allow_deletions: null,
							block_creations: null,
							required_conversation_resolution: null,
							lock_branch: null,
							allow_fork_syncing: true,
						},
					});
					// if (options.isDebugging) log("res Update main branch protection :>> ", res?.statusText);
					if (options.isDebugging) console.log("Update main branch protection :>> ", res?.statusText);
				} catch (error) {
					if (error?.response) {
						// The request was made and the server responded with a status code outside of the 2xx range
						if (error?.response?.data?.message) logWarn(error?.response?.data?.message);

						if (options.isDebugging) {
							console.log(
								"[PROTECT_GIT_BRANCH] URL:>> ",
								`https://api.github.com/repos/${owner}/${repo}/branches/${branch}/protection`
							);
							console.log("[PROTECT_GIT_BRANCH] ==> error?.response?.data\n", error?.response?.data);
							console.log("[PROTECT_GIT_BRANCH] ==> error?.response?.status\n", error?.response?.status);
							console.log("[PROTECT_GIT_BRANCH] ==> error?.response?.headers\n", error?.response?.headers);
						}
					} else if (error?.request) {
						// The request was made but no response was received
						if (options.isDebugging) console.log("[PROTECT_GIT_BRANCH] Error:\n", error?.request);
					} else {
						// Something happened in setting up the request that triggered an Error
						if (options.isDebugging) console.log("[PROTECT_GIT_BRANCH] Error:\n", error?.message);
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

export { updateBranchProtection };
