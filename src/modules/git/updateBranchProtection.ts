import axios from "axios";
import { log } from "diginext-utils/dist/xconsole/log";

import type { InputOptions } from "@/interfaces";

export default async function updateBranchProtection(options: InputOptions) {
	//

	switch (options.git?.type) {
		case "github":
			{
				const token = options.git?.access_token;
				const owner = options.git?.owner;
				const repo = options.repoSlug;
				const branch = "main";

				try {
					const res = await axios({
						method: "put",
						url: `https://api.github.com/repos/${owner}/${repo}/branches/${branch}/protection`,
						headers: {
							Accept: "application/vnd.github.v3+json",
							Authorization: `token ${token}`,
						},
						data: {
							required_status_checks: {
								strict: true,
								// @teexiii chỗ này nên là "gitguardian/security "gì đó chứ?
								contexts: ["continuous-integration/travis-ci"],
							},
							enforce_admins: true,
							required_pull_request_reviews: null,
							restrictions: null,
						},
					});
					if (options.isDebugging) log("res Update main branch protection :>> ", res);
				} catch (error) {
					console.error(`Update main branch protection error`, error);
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
