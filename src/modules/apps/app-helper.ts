import type { App, Project, User, Workspace } from "@/entities";
import type { AppConfig, ClientDeployEnvironmentConfig } from "@/interfaces";

/**
 * Parse `AppConfig` data from `App` instance
 * @param app - Should be populated ["project"]
 */
export const getAppConfigFromApp = (app: App) => {
	// hide confidential information:
	const clientDeployEnvironment: { [key: string]: ClientDeployEnvironmentConfig } = {};
	Object.entries(app.deployEnvironment).map(([env, deployEnvironment]) => {
		const { deploymentYaml, prereleaseDeploymentYaml, prereleaseUrl, envVars, cliVersion, namespaceYaml, ..._clientDeployEnvironment } =
			deployEnvironment;

		clientDeployEnvironment[env] = (_clientDeployEnvironment[env] || {}) as ClientDeployEnvironmentConfig;
	});

	const appConfig: AppConfig = {
		name: app.name,
		slug: app.slug,
		owner: (app.owner as User).slug,
		workspace: (app.workspace as Workspace).slug,
		project: (app.project as Project).slug,
		framework: app.framework,
		git: app.git,
		environment: clientDeployEnvironment,
	};

	return appConfig;
};
