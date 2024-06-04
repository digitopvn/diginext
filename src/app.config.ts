import Table from "cli-table";
import xobject, { toBool } from "diginext-utils/dist/object";
import trimNull from "diginext-utils/dist/string/trimNull";
import dotenv from "dotenv";
import fs from "fs";
import _ from "lodash";
import path from "path";

import { CLI_DIR } from "./config/const";

let appEnv: any = {};
let isNoEnvFile = false;

const envFilePath =
	trimNull(process.env.NODE_ENV) === "test" || trimNull(process.env.NODE_ENV) === "test_ci"
		? path.resolve(CLI_DIR, `.env.test`)
		: path.resolve(CLI_DIR, `.env.dev`);

if (fs.existsSync(envFilePath)) {
	dotenv.config({ path: envFilePath });
	appEnv = dotenv.config({ path: envFilePath }).parsed;
} else if (fs.existsSync(path.resolve(CLI_DIR, ".env"))) {
	dotenv.config({ path: path.resolve(CLI_DIR, ".env") });
	appEnv = dotenv.config({ path: path.resolve(CLI_DIR, ".env") }).parsed;
} else {
	// logWarn(`[SERVER] No ENV file detected.`);
	isNoEnvFile = true;
}

// dev mode?
export const isDevMode = toBool(process.env.DEV_MODE);
export const isServerMode = trimNull(process.env.CLI_MODE) === "server";
appEnv.CLI_MODE = trimNull(process.env.CLI_MODE);

const table = new Table();
if (trimNull(process.env.CLI_MODE) === "server") {
	// console.log(chalk.yellow(`------ process.env ------`));
	Object.entries(process.env).forEach(([key, val]) => {
		if (isNoEnvFile) {
			const value = _.truncate(val.toString(), { length: 60, separator: " " });
			if (key.indexOf("npm_") === -1) table.push([key, value]);
		} else {
			if (Object.keys(appEnv).includes(key)) {
				const value = _.truncate(val.toString(), { length: 60, separator: " " });
				table.push([key, value]);
			}
		}
	});
	// console.log(table.toString());
}

export enum EnvName {
	DEVELOPMENT = "development",
	TEST = "test",
	TEST_CI = "test_ci",
	STAGING = "staging",
	CANARY = "canary",
	PRODUCTION = "production",
}

// Plugins
function toInt(obj: any, valueDefault: number) {
	return typeof obj !== "undefined" ? xobject.toInt(obj) : valueDefault;
}

// Main config
export class Config {
	static grab = (key: string, defaultValue: any = "") =>
		process.env[key] ? trimNull(process.env[key]) : appEnv[key] ? trimNull(appEnv[key]) : defaultValue;

	static get ENV() {
		return EnvName[this.grab("NODE_ENV", "development").toUpperCase()] ?? EnvName.DEVELOPMENT;
	}

	static get BASE_PATH() {
		return trimNull(process.env.BASE_PATH) || "";
	}

	static get LOCATION() {
		return trimNull(process.env.LOCATION) || "unknown";
	}

	static getBasePath(extendedPath = "") {
		const { BASE_PATH } = this;
		return (BASE_PATH === "" ? BASE_PATH : `/${BASE_PATH}`) + extendedPath;
	}

	static get BASE_URL() {
		return trimNull(process.env.BASE_URL) || `http://localhost:${process.env.PORT}`;
	}

	static get PORT() {
		return trimNull(process.env.PORT) || 4000;
	}

	static get DB_URI() {
		return trimNull(process.env.DB_URI) || trimNull(process.env.MONGODB_URI);
	}

	static get DB_NAME() {
		return trimNull(process.env.DB_NAME) || "diginext";
	}

	static get CLI_MODE() {
		return trimNull(process.env.CLI_MODE) || "client";
	}

	static get SERVER_TYPE() {
		return (process.env.SERVER_TYPE || "default") as "default" | "hobby";
	}

	static get DEFAULT_DX_SERVER_URL() {
		return "https://app.dxup.dev";
	}

	static get DX_SITE_URL() {
		return trimNull(process.env.DX_SITE_URL) ? trimNull(process.env.DX_SITE_URL) : "https://dxup.dev";
	}

	static get DX_API_URL() {
		return trimNull(process.env.DX_API_URL) ? trimNull(process.env.DX_API_URL) : "https://dxup.dev/api";
	}

	static get BUILDER() {
		return trimNull(process.env.BUILDER) || "podman";
	}

	/**
	 * Share resource credentials to workspaces?
	 * - If TRUE -> Everyone can read the cloud resource's credentials (such as secrets, service accounts, api access token,...)
	 * - If FALSE -> Only the server can read cloud resource's credentials, others (CLI & API) won't, even Workspace Administrators or Moderators.
	 * @default false
	 */
	static get SHARE_RESOURCE_CREDENTIAL() {
		return typeof trimNull(process.env.SHARE_RESOURCE_CREDENTIAL) === "undefined"
			? false
			: trimNull(process.env.SHARE_RESOURCE_CREDENTIAL) === "true" ||
					process.env.SHARE_RESOURCE_CREDENTIAL === "TRUE" ||
					process.env.SHARE_RESOURCE_CREDENTIAL === "1";
	}

	static get DISABLE_INPECT_MEMORY() {
		return toBool(process.env.DISABLE_INPECT_MEMORY);
	}

	static get SECONDS_INPECT_MEMORY() {
		return toInt(process.env.SECONDS_INPECT_MEMORY, 30);
	}

	static get REDIS_HOST() {
		return trimNull(process.env.REDIS_HOST) || "";
	}

	static get REDIS_PORT() {
		return toInt(process.env.REDIS_PORT, 0);
	}

	static get REDIS_PASSWORD() {
		return trimNull(process.env.REDIS_PASSWORD) || "";
	}

	static get CORS_WHITELIST() {
		return trimNull(process.env.CORS_WHITELIST)
			? trimNull(process.env.CORS_WHITELIST).split(";")
			: ["localhost", "192.168", "127.0", "digitop.vn"];
	}
}

// Extensions
export const IsDev = function () {
	return Config.ENV === EnvName.DEVELOPMENT;
};
export const IsTest = function () {
	return Config.ENV === EnvName.TEST;
};
export const IsTestCI = function () {
	return Config.ENV === EnvName.TEST_CI;
};
export const IsStag = function () {
	return Config.ENV === EnvName.STAGING;
};
export const IsProd = function () {
	return Config.ENV === EnvName.PRODUCTION;
};
export const IsCanary = function () {
	return Config.ENV === EnvName.CANARY;
};
