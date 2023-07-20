import { logError } from "diginext-utils/dist/xconsole/log";
import _, { last } from "lodash";
import { simpleGit } from "simple-git";

/**
 * Get current git branch
 */
export const getCurrentGitBranch = async (dir = process.cwd()) => {
	const git = simpleGit(dir, { binary: "git" });
	const status = await git.status();
	const curBranch = status.current;
	return curBranch;
};

/**
 * Get latest tag of the git repository
 */
export async function getLatestTagOfGitRepo(dir = process.cwd()) {
	const git = simpleGit(dir, { binary: "git" });
	const tags = (await git.tags(["--sort", "creatordate"])).all || [];
	const latestTag = tags.length > 0 ? (last(tags) as string) : await getCurrentGitBranch(dir);
	return latestTag;
}

interface GitStageOptions {
	directory?: string;
	message?: string;
}

/**
 * Stage all files, commit them & push to git origin.
 */
export async function stageCommitAndPushAll(options: GitStageOptions) {
	const { directory = "./", message = "build(prepare): commit all files & push to origin" } = options;
	const git = simpleGit(directory, { binary: "git" });
	const gitStatus = await git.status(["-s"]);
	// log("[current branch]", gitStatus.current);

	const currentBranch = gitStatus.current;
	const currentBranchKebab = _.kebabCase(currentBranch);

	// commit & push everything, then try to merge "master" to current branch
	try {
		await git.pull("origin", currentBranch, ["--no-ff"]);
		await git.add("./*");
		await git.commit(message);
		await git.push("origin", currentBranch);
	} catch (e) {
		logError(e);
	}

	return { currentBranch, currentBranchKebab };
}
