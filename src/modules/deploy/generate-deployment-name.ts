import type { IApp, IProject } from "@/entities";
import { makeSlug } from "@/plugins/slug";

/**
 * Generate a deployment name that use for deployment YAML (Ingress, Service, Deployment,...)
 * @param app {IApp} - Must populated "project" field
 * @returns
 */
export default function getDeploymentName(app: IApp) {
	if (!app.project) throw new Error(`This app doesn't integrate with any projects.`);

	const project = app.project as IProject;
	if (!project.name) throw new Error(`Invalid project: project must have name.`);
	if (!app.name) throw new Error(`Invalid app: app must have name.`);

	let name = `${makeSlug(project.name.toLowerCase())}-${makeSlug(app.name).toLowerCase()}`;
	// if (name.length > 63) name = `${project.name}-app-${makeDaySlug({ divider: "" })}`;

	if (name.length > 63)
		throw new Error(`Deployment name "${name}" is longer than 64 characters, change the app name or project name to something shorter.`);

	return name;
}
