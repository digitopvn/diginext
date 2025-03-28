import type { ClientDeployEnvironmentConfig } from "./DeployEnvironment";

export interface AppConfig {
	name?: string;
	slug?: string;
	owner?: string;
	workspace?: string;
	cliVersion?: string;
	/**
	 * Project SLUG
	 */
	project?: string;

	framework?: {
		name?: string;
		slug?: string;
		repoSSH?: string;
		version?: string;
	};

	git?: {
		provider?: string;
		repoURL?: string;
		repoSSH?: string;
	};

	deployEnvironment?: {
		[key: string]: ClientDeployEnvironmentConfig;
	};
}
