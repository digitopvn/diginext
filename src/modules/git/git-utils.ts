import { execCmd } from "@/plugins";

export const getCurrentGitBranch = async (dir = process.cwd()) => {
	const branch = await execCmd(`cd "${dir}" && git branch --show-current`);
	return branch;
};
