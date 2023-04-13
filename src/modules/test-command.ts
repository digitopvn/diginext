import path from "path";

import type { InputOptions } from "@/interfaces";
import { pullOrCloneGitRepo } from "@/plugins";

export const testCommand = async (options?: InputOptions) => {
	// 63b117e2387f529fc07d7673
	// const testIds = ["63eb404227aea2b9b212ee4d", new ObjectID("63b117e2387f529fc07d7673"), "123", "testtesttesttest", "11111111111111111111111"];
	// testIds.map((id) => console.log(`${id} :>> ${isValidObjectID(id)}`));

	// const git = simpleGit(process.cwd());
	// console.log(await git.getRemotes(true));
	// console.log(await git.listRemote());

	// const status = await git.status();
	// const curBranch = status.current;
	// console.log(`getCurrentGitBranch >`, { curBranch });

	await pullOrCloneGitRepo(
		"git@bitbucket.org:digitopvn/static-site-framework.git",
		path.resolve(process.cwd(), "cli-static-test"),
		"test/dx-deploy"
	);
};
