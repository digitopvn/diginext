import { Release } from "@/entities";

import BaseService from "./BaseService";

export default class ReleaseService extends BaseService<Release> {
	constructor() {
		super(Release);
	}

	async checkActive(filter = {}) {
		// const namespace =
		// const currentDeploy = await ClusterManager.getDeploy(diginext.projectSlug, namespace);
		// const currentImage = currentDeploy.spec.template.spec.containers[0].image;
		// log("currentImage", currentImage);
		// const activeRelease = await this.findOne(
		// 	{ ...filter, image: currentImage },
		// 	{ select: "id image namespace active" }
		// );
		// // log("activeRelease", activeRelease);
		// if (activeRelease) {
		// 	const { id, image, namespace, diginext } = activeRelease;
		// 	await this.update({ ...filter }, { active: false });
		// 	await this.updateOne(id, { active: true });
		// }
	}

	// async create(params) {
	// 	// validate
	// 	if (!params.name) return { error: "Name is required." };
	// 	if (!params.appSlug) return { error: "App slug is required." };
	// 	if (!params.projectSlug) return { error: "Project slug is required." };

	// 	// log(`params >>`, params);

	// 	const { projectSlug, appSlug, owner, workspace } = params;

	// 	// create new project if not existed:
	// 	const projectSvc = new ProjectService();
	// 	const projectCount = await projectSvc.count({ slug: projectSlug });
	// 	const isProjectExisted = projectCount > 0;
	// 	let project;

	// 	log(`projectSlug >>`, projectSlug);
	// 	log(`projectCount >>`, projectCount);
	// 	log(`isProjectExisted >>`, isProjectExisted);

	// 	if (!isProjectExisted) {
	// 		const newProject = await projectSvc.create({
	// 			name: projectSlug,
	// 			slug: projectSlug,
	// 			createdBy: params.createdBy || "server",
	// 			owner,
	// 			workspace,
	// 		});
	// 		project = newProject;
	// 	} else {
	// 		project = await projectSvc.findOne({ slug: projectSlug });
	// 		if (!project) return { error: "Project not found." };
	// 	}

	// 	// insert new release
	// 	const data = { ...params, project: project.id ?? project._id };

	// 	const newItem = await super.create(data);

	// 	// log(`newItem >>`, newItem);

	// 	return newItem;
	// }
}
export { ReleaseService };
