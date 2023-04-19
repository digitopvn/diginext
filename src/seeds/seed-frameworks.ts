import { log } from "diginext-utils/dist/console/log";

import type { FrameworkDto, IFramework, IUser, IWorkspace } from "@/entities";
import { DB } from "@/modules/api/DB";

const initialFrameworks = [
	{
		name: "NextJS 13 Starter",
		repoURL: "https://github.com/digitopvn/next13-starter",
		repoSSH: "git@github.com:digitopvn/next13-starter.git",
		gitProvider: "github",
		isPrivate: false,
		mainBranch: "main",
	},
	{
		name: "Static Site Starter with NGINX",
		repoURL: "https://github.com/digitopvn/static-nginx-site",
		repoSSH: "git@github.com:digitopvn/static-nginx-site.git",
		gitProvider: "github",
		isPrivate: false,
		mainBranch: "main",
	},
] as FrameworkDto[];

export const seedFrameworks = async (workspace: IWorkspace, owner: IUser) => {
	const results = (
		await Promise.all(
			initialFrameworks.map(async (fw) => {
				const framework = await DB.findOne<IFramework>("framework", { repoURL: fw.repoURL, workspace: workspace._id });
				if (!framework) {
					const seedFw = await DB.create<IFramework>("framework", { ...fw, owner: owner._id, workspace: workspace._id });
					return seedFw;
				}
				return framework;
			})
		)
	).filter((res) => typeof res !== "undefined");

	if (results.length > 0) log(`Workspace "${workspace.name}" > Seeded ${results.length} frameworks.`);

	return results;
};
