import type { IApp, IProject, IUser, IWorkspace } from "@/entities";
import type { AppConfig, ClientDeployEnvironmentConfig, InputOptions } from "@/interfaces";

/**
 * Parse `AppConfig` data from `App` instance
 * @param app - Should be populated ["project", "owner", "workspace"]
 */
export const getAppConfigFromApp = (app: IApp, options?: InputOptions) => {
	// hide confidential information:
	const clientDeployEnvironment: { [key: string]: ClientDeployEnvironmentConfig } = {};
	Object.entries(app.deployEnvironment || {}).map(([env, deployEnvironment]) => {
		const { deploymentYaml, prereleaseDeploymentYaml, prereleaseUrl, cliVersion, namespaceYaml, ..._clientDeployEnvironmentData } =
			deployEnvironment;

		clientDeployEnvironment[env] = (_clientDeployEnvironmentData || {}) as ClientDeployEnvironmentConfig;
	});
	if (options?.isDebugging) console.log("clientDeployEnvironment :>> ", clientDeployEnvironment);

	// parse app config
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
