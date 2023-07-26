import type { IApp, IProject } from "@/entities";
import { makeSlug } from "@/plugins/slug";

/**
 * Generate a deployment name that use for deployment YAML (Ingress, Service, Deployment,...)
 * @param app {IApp} - Must populated "project" field
 * @returns
 */
export default async function getDeploymentName(app: IApp) {
	const { DB } = await import("@/modules/api/DB");
	if (!app.project) throw new Error(`This app doesn't integrate with any projects.`);

	let project = app.project as IProject;
	if (!project.name) project = await DB.findOne("project", { _id: app.project });

	if (!project) throw new Error(`This app doesn't integrate with any projects.`);
	if (!app.name) throw new Error(`Invalid app: app must have name.`);

	let name = `${makeSlug(project.name.toLowerCase())}-${makeSlug(app.name).toLowerCase()}`;
	if (name.length > 63)
		throw new Error(`Deployment name "${name}" is longer than 64 characters, change the app name or project name to something shorter.`);

	return name;
}
