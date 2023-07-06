import type { IProject, IUser, IWorkspace, ProjectDto } from "@/entities";
import { DB } from "@/modules/api/DB";

export const initialProjects: ProjectDto[] = [
	{
		name: "Default",
		isDefault: true,
	},
];

export const seedProjects = async (workspace: IWorkspace, owner: IUser) => {
	const results = (
		await Promise.all(
			initialProjects.map(async (proj) => {
				const project = await DB.findOne<IProject>("project", { isDefault: true, workspace: workspace._id });
				if (!project) {
					const seedProj = await DB.create<IProject>(
						"project",
						{ ...proj, owner: owner._id, workspace: workspace._id },
						{ isDebugging: true }
					);
					return seedProj;
				}
				return project;
			})
		)
	).filter((res) => typeof res !== "undefined");

	return results;
};
