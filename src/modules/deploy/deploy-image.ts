import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";

import type { IApp, IBuild, IProject, IUser, IWorkspace } from "@/entities";
import type { AppConfig, DeployEnvironment } from "@/interfaces";
import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";
import { MongoDB } from "@/plugins/mongodb";

import { DB } from "../api/DB";
import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import { queue } from "../build";
import { createReleaseFromBuild } from "../build/create-release-from-build";
import ClusterManager from "../k8s";
import { generateDeployment } from "./index";

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
	workspace?: IWorkspace;
	/**
	 * CLI's version
	 */
	cliVersion?: string;
};

export const deployImage = async (options: DeployImageParams, appConfig: AppConfig, envVars?: KubeEnvironmentVariable[]) => {
	const { env = "dev", projectSlug, slug, username, workspaceId, cliVersion } = options;
	const { imageURL } = appConfig.deployEnvironment[env];

	// validates inputs...
	if (!projectSlug) throw new Error(`Project slug is required.`);
	if (!slug) throw new Error(`App slug is required.`);
	if (!username) throw new Error(`Author user's name is required.`);
	if (!imageURL) throw new Error(`Image URL in App config is required.`);

	const project = await DB.findOne<IProject>("project", { slug: projectSlug });
	if (!project) throw new Error(`Project "${projectSlug}" not found. Should you create a new one first?`);

	const app = await DB.findOne<IApp>("app", { slug });
	if (!app) throw new Error(`App "${slug}" not found. Should you create a new one first?`);

	const author = await DB.findOne<IUser>("user", { slug: username });

	// get workspace
	let workspace = options.workspace;
	if (!workspace) workspace = await DB.findOne<IWorkspace>("workspace", { _id: app.workspace });
	if (!workspace) workspace = await DB.findOne<IWorkspace>("workspace", { _id: project.workspace });
	if (!workspace && workspaceId) workspace = await DB.findOne<IWorkspace>("workspace", { _id: workspaceId });
	if (!workspace && author) workspace = await DB.findOne<IWorkspace>("workspace", { _id: author.activeWorkspace });

	// deploy environment
	let targetEnvironmentFromDB = await getDeployEvironmentByApp(app, env);
	const targetEnvironment = { ...appConfig.deployEnvironment[env], ...targetEnvironmentFromDB };
	// log({ targetEnvironment });

	// DOTENV variables
	const serverEnvironmentVariables = envVars || targetEnvironment?.envVars || [];

	// generate YAML deployment files
	const { endpoint, prereleaseUrl, deploymentContent, prereleaseDeploymentContent } = await generateDeployment({
		appSlug: slug,
		env,
		username,
		appConfig,
		workspace,
	});
	targetEnvironment.prereleaseUrl = prereleaseUrl;
	targetEnvironment.deploymentYaml = deploymentContent;
	targetEnvironment.prereleaseDeploymentYaml = prereleaseDeploymentContent;

	// update env vars to database:
	const updateAppData = { environment: app.environment || {}, deployEnvironment: app.deployEnvironment || {} } as IApp;
	updateAppData.deployEnvironment[env] = { ...targetEnvironment, envVars: serverEnvironmentVariables } as DeployEnvironment;
	// TODO: Remove this when everyone is using "deployEnvironment" (not JSON of "environment")
	updateAppData.environment[env] = JSON.stringify({ ...targetEnvironment, envVars: serverEnvironmentVariables });
	// log({ updateAppData });

	const updatedApps = await DB.update<IApp>("app", { slug }, updateAppData);

	// update the project so it can be sorted on top
	await DB.update<IProject>("project", { slug: projectSlug }, { lastUpdatedBy: username });

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
	} as IBuild;

	const newBuild = await DB.create<IBuild>("build", buildData);

	// create new release & roll it out if needed
	let releaseId: string;
	try {
		const newRelease = await createReleaseFromBuild(newBuild, env, { author });
		releaseId = MongoDB.toString(newRelease._id);
		// log("Created new Release successfully:", newRelease);
	} catch (e) {
		throw new Error(`Failed to create new release: ${e}`);
	}

	/**
	 * !!! ROLL OUT & IMPORTANT NOTE !!!
	 * Sử dụng QUEUE để apply deployment lên từng cluster một,
	 * không để tình trạng concurrent deploy làm deploy lên nhầm lẫn cluster
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
