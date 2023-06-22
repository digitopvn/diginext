import { simpleGit } from "simple-git";

// import { execa, execaCommand } from "execa";

export const getCurrentGitBranch = async (dir = process.cwd()) => {
	const git = simpleGit(dir, { binary: "git" });
	const status = await git.status();
	const curBranch = status.current;
	// logWarn(`getCurrentGitBranch >`, { curBranch });
	return curBranch;
};
