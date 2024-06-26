import { log } from "diginext-utils/dist/xconsole/log";
import type execa from "execa";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { toNumber } from "lodash";

import { Config } from "@/app.config";
import type { ICloudDatabase } from "@/entities/CloudDatabase";
import type { ICloudProvider } from "@/entities/CloudProvider";
import type { ICluster } from "@/entities/Cluster";
import type { IContainerRegistry } from "@/entities/ContainerRegistry";
import type { IFramework } from "@/entities/Framework";
import type { IGitProvider } from "@/entities/GitProvider";
import type { IUser } from "@/entities/User";
import type { IWorkspace } from "@/entities/Workspace";
import type InputOptions from "@/interfaces/InputOptions";
import type { ResourceQuotaSize } from "@/interfaces/SystemTypes";

import { readJson, saveJson } from "../plugins";
import { CLI_CONFIG_DIR, CLI_CONFIG_FILE } from "./const";

// export const cliOpts: execa.Options = isWin() ? {} : { shell: "bash" };
export const cliOpts: execa.Options = {};

const originalCPU = 20;
const originalMemory = 128;

function getQuotaByScale(origin: number, scale: number) {
	let result = origin;
	for (let i = 1; i < scale; i++) result *= 2;
	return result;
}

export const getContainerResourceBySize = (size: ResourceQuotaSize) => {
	if (size == "none") return {};
	const scale = toNumber(size.substring(0, size.length - 1));
	return {
		requests: {
			cpu: `${getQuotaByScale(originalCPU, scale)}m`,
			memory: `${getQuotaByScale(originalMemory, scale)}Mi`,
		},
		limits: {
			cpu: `${getQuotaByScale(originalCPU, scale)}m`,
			memory: `${getQuotaByScale(originalMemory, scale)}Mi`,
		},
	};
};

export type CliConfig = {
	buildServerUrl?: string;

	access_token?: string;
	refresh_token?: string;
	apiToken?: string;

	currentUser?: IUser;
	currentWorkspace?: IWorkspace;

	defaultFramework?: IFramework;

	github_access_token?: string;

	currentGitProvider?: IGitProvider;
	currentRegistry?: IContainerRegistry;
	currentProvider?: ICloudProvider;
	currentCluster?: ICluster;
	currentDatabase?: ICloudDatabase;

	gitProviders?: IGitProvider[];
	k8sClusters?: ICluster[];
	containerRegistries?: IContainerRegistry[];
	providers?: ICloudProvider[];
	databases?: ICloudDatabase[];
	frameworks?: IFramework[];
};

/**
 * Get local CLI config
 */
export const getCliConfig = () => {
	// Create new config file if it's not existed
	if (!existsSync(CLI_CONFIG_DIR)) mkdirSync(CLI_CONFIG_DIR, { recursive: true });
	if (!existsSync(CLI_CONFIG_FILE)) writeFileSync(CLI_CONFIG_FILE, "{}", "utf8");

	const conf = readJson(CLI_CONFIG_FILE) as CliConfig;
	if (!conf.buildServerUrl) conf.buildServerUrl = Config.BASE_URL;
	return conf;
};

/**
 * Save/update CLI config locally
 * @param {CliConfig} updatedConfig
 */
export const saveCliConfig = (updatedConfig: CliConfig) => {
	const conf: CliConfig = { ...getCliConfig(), ...updatedConfig };
	return saveJson(JSON.stringify(conf), CLI_CONFIG_FILE, { overwrite: true }) as CliConfig;
};

export const execConfig = async (options?: InputOptions) => {
	const conf = getCliConfig();
	log(conf);

	// const { secondAction, thirdAction } = options;

	// switch (secondAction) {
	// 	case "get":
	// 		const conf = getCliConfig();
	// 		log(conf);
	// 		return conf;

	// 	default:
	// 		log(`Huh?`);
	// 		break;
	// }
};
