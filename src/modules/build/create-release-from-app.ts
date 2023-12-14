import dayjs from "dayjs";
import { isEmpty } from "lodash";

import type { IApp, IRelease, IUser, IWorkspace } from "@/entities";
import type { AppConfig } from "@/interfaces/AppConfig";
import { formatEnvVars } from "@/plugins/env-var";

import { getDeployEvironmentByApp } from "../apps/get-app-environment";
import { fetchDeploymentFromContent } from "../deploy/fetch-deployment";

type OwnershipParams = {
	author: IUser;
	workspace?: IWorkspace;
	cliVersion?: string;
};

export const createReleaseFromApp = async (app: IApp, env: string, buildTag: string, ownership?: OwnershipParams) => {
	const { DB } = await import("@/modules/api/DB");

	const startTime = dayjs();

	const deployedEnvironment = await getDeployEvironmentByApp(app, env);
	const { imageURL: IMAGE_NAME } = deployedEnvironment;

	if (!buildTag) throw new Error(`Build not found due to "undefined" build number (app: "${app.slug}" - env: "${env}")`);

	console.log("createReleaseFromApp() > IMAGE_NAME :>> ", IMAGE_NAME);
	console.log("createReleaseFromApp() > buildTag :>> ", buildTag);

	const build = await DB.findOne("build", { image: IMAGE_NAME, tag: buildTag }, { order: { createdAt: -1 } });
	if (!build) throw new Error(`Unable to create new release: build image "${IMAGE_NAME}" not found.`);

	const project = await DB.findOne("project", { slug: app.projectSlug });
	if (!project) throw new Error(`Unable to create new release: project "${app.projectSlug}" not found.`);

	// get deployment data
	const { branch, cliVersion } = build;
	const { slug: projectSlug } = project;
	const { owner, workspace, slug: appSlug } = app;
	const { slug: workspaceSlug, _id: workspaceId } = workspace as IWorkspace;
	const { deploymentYaml, prereleaseDeploymentYaml, namespace, provider, project: providerProject, cluster } = deployedEnvironment;

	const deploymentData = fetchDeploymentFromContent(deploymentYaml);
	const prereleaseDeploymentData = fetchDeploymentFromContent(prereleaseDeploymentYaml);

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
		status: "in_progress",
		buildStatus: "success",
		startTime: startTime.toDate(),
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
		workspace: workspaceId,
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
