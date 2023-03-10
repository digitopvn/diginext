import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";

import type { App, Build, Project, User, Workspace } from "@/entities";
import type { AppConfig, DeployEnvironment } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";

import { DB } from "../api/DB";
import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import { queue } from "../build";
import { createReleaseFromBuild } from "../build/create-release-from-build";
import ClusterManager from "../k8s";
import { generateDeployment } from ".";

export type DeployImageParams = {
	/**
	 * Project's slug
	 */
	projectSlug: string;
	/**
	 * App's slug
	 */
	slug: string;
	/**
	 * Username is user's slug
	 */
	username: string;
	/**
	 * @example "dev" | "prod"
	 */
	env?: string;
	/**
	 * Workspace's ObjectID
	 */
	workspaceId?: string;
	/**
	 * {Workspace} data
	 */
	workspace?: Workspace;
	/**
	 * CLI's version
	 */
	cliVersion?: string;
};

export const deployImage = async (options: DeployImageParams, appConfig: AppConfig, envVars?: KubeEnvironmentVariable[]) => {
	const { env = "dev", projectSlug, slug, username, workspaceId, cliVersion } = options;
	const { imageURL } = appConfig.environment[env];

	// validates inputs...
	if (!projectSlug) throw new Error(`Project slug is required.`);
	if (!slug) throw new Error(`App slug is required.`);
	if (!username) throw new Error(`Author user's name is required.`);
	if (!imageURL) throw new Error(`Image URL in App config is required.`);

	const project = await DB.findOne<Project>("project", { slug: projectSlug });
	if (!project) throw new Error(`Project "${projectSlug}" not found. Should you create a new one first?`);

	const app = await DB.findOne<App>("app", { slug });
	if (!app) throw new Error(`App "${slug}" not found. Should you create a new one first?`);

	const author = await DB.findOne<User>("user", { slug: username });

	// get workspace
	let workspace = options.workspace;
	if (!workspace) workspace = await DB.findOne<Workspace>("workspace", { _id: app.workspace });
	if (!workspace) workspace = await DB.findOne<Workspace>("workspace", { _id: project.workspace });
	if (!workspace && workspaceId) workspace = await DB.findOne<Workspace>("workspace", { _id: workspaceId });
	if (!workspace && author) workspace = await DB.findOne<Workspace>("workspace", { _id: author.activeWorkspace });

	// deploy environment
	let targetEnvironmentFromDB = await getDeployEvironmentByApp(app, env);
	const targetEnvironment = { ...appConfig.environment[env], ...targetEnvironmentFromDB };
	// log({ targetEnvironment });

	// DOTENV variables
	const serverEnvironmentVariables = envVars || targetEnvironment?.envVars || [];

	// generate YAML deployment files
	const { endpoint, prereleaseUrl, deploymentContent, prereleaseDeploymentContent } = await generateDeployment({
		env,
		username,
		appConfig,
		workspace,
	});
	targetEnvironment.prereleaseUrl = prereleaseUrl;
	targetEnvironment.deploymentYaml = deploymentContent;
	targetEnvironment.prereleaseDeploymentYaml = prereleaseDeploymentContent;

	// update env vars to database:
	const updateAppData = { environment: app.environment || {}, deployEnvironment: app.deployEnvironment || {} } as App;
	updateAppData.deployEnvironment[env] = { ...targetEnvironment, envVars: serverEnvironmentVariables } as DeployEnvironment;
	// TODO: Remove this when everyone is using "deployEnvironment" (not JSON of "environment")
	updateAppData.environment[env] = JSON.stringify({ ...targetEnvironment, envVars: serverEnvironmentVariables });
	// log({ updateAppData });

	const updatedApps = await DB.update<App>("app", { slug }, updateAppData);

	// update the project so it can be sorted on top
	await DB.update<Project>("project", { slug: projectSlug }, { lastUpdatedBy: username });

	// Create new build:
	const SOCKET_ROOM = `${slug}-${makeDaySlug()}`;
	const buildData = {
		name: `[${env.toUpperCase()}] ${imageURL}`,
		slug: SOCKET_ROOM,
		// tag: buildNumber,
		status: "success",
		env,
		createdBy: username,
		projectSlug,
		appSlug: slug,
		image: imageURL,
		app: app._id,
		project: project._id,
		owner: author._id,
		workspace: workspace._id,
		cliVersion,
	} as Build;

	const newBuild = await DB.create<Build>("build", buildData);

	// create new release & roll it out if needed
	let releaseId: string;
	try {
		const newRelease = await createReleaseFromBuild(newBuild, { author });
		releaseId = newRelease._id.toString();
		// log("Created new Release successfully:", newRelease);
	} catch (e) {
		throw new Error(`Failed to create new release: ${e}`);
	}

	/**
	 * !!! ROLL OUT & IMPORTANT NOTE !!!
	 * S??? d???ng QUEUE ????? apply deployment l??n t???ng cluster m???t,
	 * kh??ng ????? t??nh tr???ng concurrent deploy l??m deploy l??n nh???m l???n cluster
	 */
	if (releaseId) {
		try {
			const result = await queue.add(() => (env === "prod" ? ClusterManager.previewPrerelease(releaseId) : ClusterManager.rollout(releaseId)));
			if (result.error) throw new Error(`Queue job failed -> ClusterManager.rollout() -> ${result.error}`);
			return { build: newBuild, release: result.data };
		} catch (e) {
			throw new Error(`Queue job failed -> ClusterManager.rollout() -> ${e.message}`);
		}
	}
};
