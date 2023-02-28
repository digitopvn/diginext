import { log } from "diginext-utils/dist/console/log";

import type { Framework } from "@/entities";
import { DB } from "@/modules/api/DB";

const initialFrameworks: Framework[] = [
	{
		name: "Diginext13",
		repoURL: "https://bitbucket.org/digitopvn/diginext13/",
		repoSSH: "git@bitbucket.org:digitopvn/diginext13.git",
		gitProvider: "bitbucket",
		isPrivate: true,
	},
	{
		name: "Static Site Starter",
		repoURL: "https://bitbucket.org/digitopvn/static-site-framework.git",
		repoSSH: "git@bitbucket.org:digitopvn/static-site-framework.git",
		gitProvider: "bitbucket",
		isPrivate: true,
	},
];

export const seedRoutes = async () => {
	const results = (
		await Promise.all(
			initialFrameworks.map(async (fw) => {
				const framework = await DB.findOne<Framework>("framework", { repoURL: fw.repoURL });
				if (!framework) {
					const seedFw = await DB.create<Framework>("framework", fw);
					return seedFw;
				}
				return framework;
			})
		)
	).filter((res) => typeof res !== "undefined");

	if (results.length > 0) log(`[SEEDING] Seeded ${results.length} frameworks.`);
};

// export default { seedRoutes };
