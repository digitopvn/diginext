import type { IApp, IProject, IUser, IWorkspace } from "@/entities";
import type { AppConfig, ClientDeployEnvironmentConfig } from "@/interfaces";

/**
 * Parse `AppConfig` data from `App` instance
 * @param app - Should be populated ["project", "owner", "workspace"]
 */
export const getAppConfigFromApp = (app: IApp) => {
	// hide confidential information:
	const clientDeployEnvironment: { [key: string]: ClientDeployEnvironmentConfig } = {};
	Object.entries(app.deployEnvironment || {}).map(([env, deployEnvironment]) => {
		const { deploymentYaml, prereleaseDeploymentYaml, prereleaseUrl, envVars, cliVersion, namespaceYaml, ..._clientDeployEnvironmentData } =
			deployEnvironment;

		clientDeployEnvironment[env] = (_clientDeployEnvironmentData || {}) as ClientDeployEnvironmentConfig;
	});
	// console.log("clientDeployEnvironment :>> ", clientDeployEnvironment);
	const appConfig: AppConfig = {
		name: app.name,
		slug: app.slug,
		owner: (app.owner as IUser).slug,
		workspace: (app.workspace as IWorkspace).slug,
		project: app.projectSlug || (app.project as IProject).slug,
		framework: app.framework,
		git: app.git,
		deployEnvironment: clientDeployEnvironment,
	};

	return appConfig;
};
