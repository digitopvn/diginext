import { getCurrentGitRepoData } from "@/plugins";
import { makeSlug } from "@/plugins/slug";

import { getLatestTagOfGitRepo } from "../git/git-utils";

export async function generateBuildTag(dir = process.cwd(), optionalValues?: { branch?: string }) {
	const { DB } = await import("@/modules/api/DB");

	const repo = await getCurrentGitRepoData(dir);
	if (!repo) throw new Error(`This directory doesn't have any git integrated: ${dir}`);
	const { repoSSH } = repo;

	const currentTag = makeSlug((await getLatestTagOfGitRepo(dir)) || optionalValues?.branch, { delimiter: "-" });

	let app = await DB.findOne("app", { "git.repoSSH": repoSSH });
	if (!app) throw new Error(`App not found.`);

	const buildNumber = (app.buildNumber ?? 0) + 1;
	app = await DB.updateOne("app", { _id: app._id }, { buildNumber });

	return { number: buildNumber, tag: `${currentTag}-${buildNumber}` };
}
