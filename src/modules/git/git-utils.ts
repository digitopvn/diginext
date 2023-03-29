import { logWarn } from "diginext-utils/dist/console/log";

import { execCmd } from "@/plugins";
// import execa from "execa";

export const getCurrentGitBranch = async (dir = process.cwd()) => {
	try {
		process.chdir(dir);
	} catch (e) {
		logWarn(`getCurrentGitBranch >`, e);
	}

	const branch = await execCmd(`git branch --show-current`);
	return branch;
};
