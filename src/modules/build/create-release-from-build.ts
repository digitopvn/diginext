import { isJSON } from "class-validator";
import { isEmpty } from "lodash";

import type { App, Build, Project, Release, User, Workspace } from "@/entities";
import type { AppConfig } from "@/interfaces/AppConfig";
import type { DeployEnvironment } from "@/interfaces/DeployEnvironment";

import { DB } from "../api/DB";
import { fetchDeploymentFromContent } from "../deploy/fetch-deployment";

type OwnershipParams = {
	author: User;
	workspace?: Workspace;
};

export const createReleaseFromBuild = async (build: Build, ownership?: OwnershipParams) => {
	// get app data
	const app = await DB.findOne<App>("app", { id: build.app }, { populate: ["owner", "workspace"] });

	if (!app) {
		throw new Error(`App "${build.appSlug}" not found.`);
	}

	// console.log("app :>> ", app);

	const project = await DB.findOne<Project>("project", { id: build.project });

	if (!project) {
		throw new Error(`Project "${build.projectSlug}" not found.`);
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
	const newRelease = DB.create<Release>("release", data);

	// log("Created new Release successfully:", newRelease);

	return newRelease;
};
