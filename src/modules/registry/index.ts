import { logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import * as fs from "fs";
import path from "path";

import { CLI_CONFIG_DIR } from "@/config/const";
import type { ContainerRegistry } from "@/entities";
import type InputOptions from "@/interfaces/InputOptions";

import digitalocean from "../providers/digitalocean";
import gcloud from "../providers/gcloud";

export const connect = async (registry: ContainerRegistry, options?: { userId?: any; workspaceId?: any }) => {
	const { provider, host } = registry;

	switch (provider) {
		case "gcloud":
			const { serviceAccount } = registry;

			const tmpDir = path.resolve(CLI_CONFIG_DIR, `registry`);
			if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
			const tmpFilePath = path.resolve(tmpDir, `gcloud-service-account.json`);
			fs.writeFileSync(tmpFilePath, serviceAccount, "utf8");

			const authResult = await gcloud.authenticate({ filePath: tmpFilePath, ...options });
			const connectResult = await gcloud.connectDockerRegistry({ filePath: tmpFilePath, host, ...options });
			if (connectResult) logSuccess(`[CONTAINER REGISTRY] Connected to Container Registry: "gcloud"`);
			// console.log("authResult :>> ", authResult);
			return authResult;

		case "digitalocean":
			const { apiAccessToken } = registry;
			const doResult = await digitalocean.authenticate({ key: apiAccessToken, ...options });
			if (doResult) logSuccess(`[CONTAINER REGISTRY] Connected to Container Registry: "digitalocean"`);
			return doResult;

		default:
			logError(`[CONTAINER REGISTRY] This container registry is not supported (${provider}), only "gcloud" and "digitalocean" are supported.`);
			return false;
	}
};

export const execRegistry = (options: InputOptions) => {
	const { provider, secondAction } = options;

	switch (secondAction) {
		case "connect":
			if (provider == "gcloud") return gcloud.connectDockerRegistry(options);
			if (provider == "digitalocean") return digitalocean.connectDockerRegistry(options);
			logWarn(`Provider "${provider}" is not valid.`);
			break;

		case "allow":
			if (provider == "gcloud") return gcloud.createImagePullingSecret(options);
			if (provider == "digitalocean") return digitalocean.createImagePullingSecret(options);
			logWarn(`Provider "${provider}" is not valid.`);
			break;

		case "secret":
			// TODO: get "imagePullSecrets" value as JSON or YAML (from database)
			break;

		default:
			break;
	}
};
