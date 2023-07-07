import type { IUser, IWorkspace, ProjectDto } from "@/entities";
import { DB } from "@/modules/api/DB";

export const initialProjects: ProjectDto[] = [
	{
		name: "Default",
		isDefault: true,
	},
];

export const seedDefaultProjects = async (workspace: IWorkspace, owner: IUser) => {
	const results = (
		await Promise.all(
			initialProjects.map(async (proj) => {
				const project = await DB.findOne("project", { isDefault: true, workspace: workspace._id });
				if (!project) {
					const seedProj = await DB.create("project", { ...proj, owner: owner._id, workspace: workspace._id }, { isDebugging: true });
					return seedProj;
				}
				return project;
			})
		)
	).filter((res) => typeof res !== "undefined");

	return results;
};
