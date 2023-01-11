import { isJSON } from "class-validator";
import { isEmpty } from "lodash";

import { isServerMode } from "@/app.config";
import type { App, Build, Release, User, Workspace } from "@/entities";
import type { AppConfig } from "@/interfaces/AppConfig";
import type { DeployEnvironment } from "@/interfaces/DeployEnvironment";
import AppService from "@/services/AppService";
import ProjectService from "@/services/ProjectService";
import ReleaseService from "@/services/ReleaseService";

import { fetchApi } from "../api";
import { fetchDeploymentFromContent } from "../deploy/fetch-deployment";

type OwnershipParams = {
	author: User;
	workspace?: Workspace;
};

export const createReleaseFromBuild = async (build: Build, ownership?: OwnershipParams) => {
	// get app data
	let app;
	if (isServerMode) {
		const appSvc = new AppService();
		app = await appSvc.findOne({ id: build.app }, { populate: ["owner", "workspace"] });
	} else {
		const { data } = await fetchApi<App>({ url: `/api/v1/app?id=${build.app}` });
		app = data;
	}

	if (!app) {
		throw new Error(`App "${build.appSlug}" not found.`);
		return;
	}

	// console.log("app :>> ", app);

	// get project data
	let project;
	if (isServerMode) {
		const projectSvc = new ProjectService();
		project = await projectSvc.findOne({ id: build.project });
	} else {
		const { data } = await fetchApi<App>({ url: `/api/v1/project?id=${build.project}` });
		project = data;
	}

	if (!project) {
		throw new Error(`Project "${build.projectSlug}" not found.`);
		return;
	}
	// console.log("project :>> ", project);

	// get deployment data
	const { env, branch, image, tag } = build;
	const { slug: projectSlug } = project;
	const { owner, workspace, environment, slug: appSlug } = app;

	const BUILD_NUMBER = tag ?? image.split(":")[1];
	// console.log("BUILD_NUMBER :>> ", BUILD_NUMBER);

	// traverse and parse "environment":
	Object.entries(environment).forEach(([key, val]) => {
		environment[key] = isJSON(val) ? JSON.parse(val as string) : {};
	});
	// console.log("environment :>> ", environment);

	const deployedEnvironment = environment[env] as DeployEnvironment;
	// console.log(`deployedEnvironment > ${env} :>>`, deployedEnvironment);

	const { deploymentYaml, prereleaseDeploymentYaml, namespace, provider, project: providerProject, cluster } = deployedEnvironment;

	const deploymentData = fetchDeploymentFromContent(deploymentYaml);
	const prereleaseDeploymentData = fetchDeploymentFromContent(prereleaseDeploymentYaml);

	// log({ deploymentData });
	// log({ prereleaseDeploymentData });

	const { IMAGE_NAME, APP_ENV } = deploymentData;

	const defaultAuthor = owner as User;
	const workspaceSlug = (workspace as Workspace).slug;

	// declare AppConfig
	const appConfig = {
		name: app.name,
		slug: appSlug,
		project: projectSlug,
		owner: defaultAuthor.slug,
		workspace: workspaceSlug,
		framework: app.framework,
		git: app.git,
		environment,
	} as AppConfig;

	// prepare release data
	const data = {
		env,
		name: `${projectSlug}/${appSlug}:${BUILD_NUMBER}`,
		image: IMAGE_NAME,
		diginext: JSON.stringify(appConfig),
		projectSlug: projectSlug,
		appSlug: appSlug,
		// build
		branch: branch,
		buildStatus: "success" as "success" | "start" | "building" | "failed",
		active: env !== "prod",
		// deployment target
		namespace: namespace,
		provider: provider,
		cluster: cluster,
		providerProjectId: providerProject,
		// deployment
		endpoint: !isEmpty(deploymentData.domains) ? deploymentData.domains[0] : "",
		deploymentYaml: deploymentData.deployContent,
		// production
		productionUrl: !isEmpty(deploymentData.domains) ? deploymentData.domains[0] : "",
		prodYaml: deploymentData.deployContent,
		// relationship
		app: app._id,
		project: project._id,
		// ownership
		createdBy: isEmpty(ownership) ? defaultAuthor.slug : ownership.author.slug,
		owner: isEmpty(ownership) ? defaultAuthor._id : ownership.author._id,
		workspace: workspaceSlug,
	} as Release;

	data.envVars = !isEmpty(APP_ENV) ? JSON.stringify(APP_ENV) : "[]";

	if (env === "prod") {
		// prerelease
		data.preYaml = prereleaseDeploymentData.deployContent;
		data.prereleaseUrl = prereleaseDeploymentData.domains[0];
	}

	// log(`createReleaseFromBuild :>>`, { data });

	// create new release in the database
	let newRelease;
	if (isServerMode) {
		const releaseSvc = new ReleaseService();
		newRelease = await releaseSvc.create(data);
	} else {
		const res = await fetchApi<Release>({ url: `/api/v1/release`, method: "POST", data });
		newRelease = res.data;
	}
	// log("Created new Release successfully:", newRelease);

	// return new release
	return newRelease;
};
