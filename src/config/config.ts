import { log } from "diginext-utils/dist/xconsole/log";
import type execa from "execa";
import { existsSync, mkdirSync, writeFileSync } from "fs";

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

const originalCPU = 50;
const originalMemory = 128;

export type ResourceQuota = {
	requests: { cpu: string | null; memory: string | null };
	limits: { cpu: string | null; memory: string | null };
};

export const containerCpus = ["50m", "100m", "200m", "400m", "600m", "1000m", "2000m", "4000m", "8000m", "16000m"];
export const containerMemories = ["128Mi", "256Mi", "512Mi", "1024Mi", "2048Mi", "4096Mi", "8192Mi", "16384Mi", "32768Mi", "65536Mi"];

export function getContainerResource(cpu: string | null, memory: string | null) {
	const resource: ResourceQuota = {
		requests: { cpu, memory },
		limits: { cpu, memory },
	};
	return resource;
}

export const containerResources: Record<ResourceQuotaSize, ResourceQuota> = {
	none: {
		requests: { cpu: null, memory: null },
		limits: { cpu: null, memory: null },
	},
	"1x": {
		requests: { cpu: "50m", memory: "128Mi" },
		limits: { cpu: "50m", memory: "128Mi" },
	},
	"2x": {
		requests: { cpu: "100m", memory: "256Mi" },
		limits: { cpu: "100m", memory: "256Mi" },
	},
	"3x": {
		requests: { cpu: "200m", memory: "512Mi" },
		limits: { cpu: "200m", memory: "512Mi" },
	},
	"4x": {
		requests: { cpu: "400m", memory: "1024Mi" },
		limits: { cpu: "400m", memory: "1024Mi" },
	},
	"5x": {
		requests: { cpu: "600m", memory: "2048Mi" },
		limits: { cpu: "600m", memory: "2048Mi" },
	},
	"6x": {
		requests: { cpu: "1000m", memory: "4096Mi" },
		limits: { cpu: "1000m", memory: "4096Mi" },
	},
	"7x": {
		requests: { cpu: "2000m", memory: "8192Mi" },
		limits: { cpu: "2000m", memory: "8192Mi" },
	},
	"8x": {
		requests: { cpu: "4000m", memory: "16384Mi" },
		limits: { cpu: "4000m", memory: "16384Mi" },
	},
	"9x": {
		requests: { cpu: "8000m", memory: "32768Mi" },
		limits: { cpu: "8000m", memory: "32768Mi" },
	},
	"10x": {
		requests: { cpu: "16000m", memory: "65536Mi" },
		limits: { cpu: "16000m", memory: "65536Mi" },
	},
};

// function getQuotaByScale(origin: number, scale: number) {
// 	let result = origin;
// 	for (let i = 1; i < scale; i++) result *= 2;
// 	return result;
// }

export const getContainerResourceBySize = (size: ResourceQuotaSize) => {
	return containerResources[size];
};

// export const getContainerResourceBySize = (size: ResourceQuotaSize) => {
// 	if (size == "none") return {};
// 	const scale = toNumber(size.substring(0, size.length - 1));
// 	return {
// 		requests: {
// 			cpu: `${getQuotaByScale(originalCPU, scale)}m`,
// 			memory: `${getQuotaByScale(originalMemory, scale)}Mi`,
// 		},
// 		limits: {
// 			cpu: `${getQuotaByScale(originalCPU, scale)}m`,
// 			memory: `${getQuotaByScale(originalMemory, scale)}Mi`,
// 		},
// 	};
// };

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
