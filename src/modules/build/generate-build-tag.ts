import type { IApp } from "@/entities";
import { getCurrentGitRepoData } from "@/plugins";
import { makeSlug } from "@/plugins/slug";

import { getLatestTagOfGitRepo } from "../git/git-utils";

export async function generateBuildTagBySourceDir(sourceDir: string, options: { branch: string }) {
	const { DB } = await import("@/modules/api/DB");

	const { branch } = options;

	const repo = await getCurrentGitRepoData(sourceDir);
	if (!repo) throw new Error(`This directory doesn't have any git integrated: ${sourceDir}`);
	const { repoSSH } = repo;
	const latestTag = await getLatestTagOfGitRepo(sourceDir);

	const currentTag = makeSlug(latestTag || branch, { delimiter: "-" });

	let app = await DB.findOne("app", { "git.repoSSH": repoSSH });
	if (!app) throw new Error(`App not found.`);

	const buildNumber = (app.buildNumber ?? 0) + 1;
	app = await DB.updateOne("app", { _id: app._id }, { buildNumber });

	return { number: buildNumber, tag: `${currentTag}-${buildNumber}` };
}

export async function generateBuildTagByApp(app: IApp, options: { branch: string }) {
	const { DB } = await import("@/modules/api/DB");

	const currentTag = makeSlug(options?.branch, { delimiter: "-" });

	const buildNumber = (app.buildNumber ?? 0) + 1;
	app = await DB.updateOne("app", { _id: app._id }, { buildNumber });

	return { number: buildNumber, tag: `${currentTag}-${buildNumber}` };
}

export async function generateBuildTagByAppSlug(appSlug: string, options: { branch: string }) {
	const { DB } = await import("@/modules/api/DB");
	const app = await DB.findOne("app", { slug: appSlug });
	if (!app) throw new Error(`App not found.`);

	return generateBuildTagByApp(app, options);
}
