import type { FrameworkDto, IUser, IWorkspace } from "@/entities";

export const initialFrameworks: FrameworkDto[] = [
	{
		name: "Static Site Starter with NGINX",
		repoURL: "https://github.com/digitopvn/static-nginx-site",
		repoSSH: "git@github.com:digitopvn/static-nginx-site.git",
		gitProvider: "github",
		// isPrivate: false,
		mainBranch: "main",
	},
	{
		name: "NextJS 13 Starter",
		repoURL: "https://github.com/digitopvn/next13-starter",
		repoSSH: "git@github.com:digitopvn/next13-starter.git",
		gitProvider: "github",
		// isPrivate: false,
		mainBranch: "main",
	},
];

export const seedFrameworks = async (workspace: IWorkspace, owner: IUser) => {
	const { DB } = await import("@/modules/api/DB");
	const results = (
		await Promise.all(
			initialFrameworks.map(async (fw) => {
				const framework = await DB.findOne("framework", { repoURL: fw.repoURL, workspace: workspace._id });
				if (!framework) {
					const seedFw = await DB.create("framework", { ...fw, owner: owner._id, workspace: workspace._id }, { isDebugging: true });
					return seedFw;
				}
				return framework;
			})
		)
	).filter((res) => typeof res !== "undefined");

	return results;
};
