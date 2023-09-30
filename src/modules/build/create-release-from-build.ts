import { isEmpty } from "lodash";

import type { IBuild, IRelease, IUser, IWorkspace } from "@/entities";
import type { AppConfig } from "@/interfaces/AppConfig";
import { formatEnvVars } from "@/plugins/env-var";

import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import { fetchDeploymentFromContent } from "../deploy/fetch-deployment";

type OwnershipParams = {
	author: IUser;
	workspace?: IWorkspace;
	cliVersion?: string;
};

export const createReleaseFromBuild = async (build: IBuild, env?: string, ownership?: OwnershipParams) => {
	const { DB } = await import("../api/DB");

	// get app data
	const app = await DB.findOne("app", { id: build.app }, { populate: ["owner", "workspace"] });
	if (!app) throw new Error(`App "${build.appSlug}" not found.`);

	const project = await DB.findOne("project", { id: build.project });
	if (!project) throw new Error(`Project "${build.projectSlug}" not found.`);
	// console.log("project :>> ", project);

	// get deployment data
	const { branch, image, tag, cliVersion } = build;
	const { slug: projectSlug } = project;
	const { owner, workspace, slug: appSlug } = app;
	const { slug: workspaceSlug, _id: workspaceId } = workspace as IWorkspace;

	const buildTag = tag ?? image.split(":")[1];

	const deployedEnvironment = await getDeployEvironmentByApp(app, env || "dev");
	// console.log(`deployedEnvironment > ${env} :>>`, deployedEnvironment);

	const { deploymentYaml, prereleaseDeploymentYaml, namespace, provider, project: providerProject, cluster } = deployedEnvironment;

	const deploymentData = fetchDeploymentFromContent(deploymentYaml);
	const prereleaseDeploymentData = fetchDeploymentFromContent(prereleaseDeploymentYaml);

	// log({ deploymentData });
	// log({ prereleaseDeploymentData });

	const { IMAGE_NAME } = deploymentData;

	let defaultAuthor = owner as IUser;
	if (!defaultAuthor) defaultAuthor = await DB.findOne("api_key_user", { workspaces: workspaceId });

	// declare AppConfig
	const appConfig = {
		name: app.name,
		slug: appSlug,
		project: projectSlug,
		owner: defaultAuthor.slug,
		workspace: workspaceSlug,
		framework: app.framework,
		git: app.git,
		environment: app.deployEnvironment || {},
	} as AppConfig;

	// prepare release data
	const data = {
		env,
		cliVersion: ownership?.cliVersion || cliVersion,
		name: `${projectSlug}/${appSlug}:${buildTag}`,
		image: IMAGE_NAME,
		appConfig: appConfig,
		// build status
		branch: branch,
		buildStatus: "success",
		active: env !== "prod",
		// deployment target
		namespace,
		provider,
		cluster,
		providerProjectId: providerProject,
		// deployment
		endpoint: !isEmpty(deploymentData.domains) ? deploymentData.domains[0] : "",
		deploymentYaml: deploymentData.deployContent,
		envVars: formatEnvVars(app.deployEnvironment[env].envVars || []),
		// production
		productionUrl: !isEmpty(deploymentData.domains) ? deploymentData.domains[0] : "",
		// relationship
		build: build._id,
		app: app._id,
		project: project._id,
		// ownership
		projectSlug,
		appSlug,
		createdBy: isEmpty(ownership) ? defaultAuthor.slug : ownership.author.slug,
		owner: isEmpty(ownership) ? defaultAuthor._id : ownership.author._id,
		ownerSlug: ownership?.author.slug,
		workspace: workspaceId,
		workspaceSlug: workspaceSlug,
	} as IRelease;

	if (env === "prod") {
		// prerelease
		data.preYaml = prereleaseDeploymentData.deployContent;
		data.prereleaseUrl = prereleaseDeploymentData.domains[0];
	}

	// create new release in the database
	const newRelease = DB.create("release", data);

	// log("Created new Release successfully:", newRelease);

	return newRelease;
};
