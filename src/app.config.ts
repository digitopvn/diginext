import chalk from "chalk";
import Table from "cli-table";
import xobject from "diginext-utils/dist/object";
import dotenv from "dotenv";
import fs from "fs";
import _ from "lodash";
import path from "path";

import { CLI_DIR } from "./config/const";

let appEnv: any = {};
let isNoEnvFile = false;

if (fs.existsSync(path.resolve(CLI_DIR, ".env.dev"))) {
	dotenv.config({ path: path.resolve(CLI_DIR, ".env.dev") });
	appEnv = dotenv.config({ path: path.resolve(CLI_DIR, ".env.dev") }).parsed;
} else if (fs.existsSync(path.resolve(CLI_DIR, ".env"))) {
	dotenv.config({ path: path.resolve(CLI_DIR, ".env") });
	appEnv = dotenv.config({ path: path.resolve(CLI_DIR, ".env") }).parsed;
} else {
	// logWarn(`[SERVER] No ENV file detected.`);
	isNoEnvFile = true;
}

// dev mode?
export const isDevMode =
	process.env.DEV_MODE ||
	process.env.DEV_MODE === "true" ||
	(typeof process.env.DEV_MODE === "number" && process.env.DEV_MODE === 1) ||
	process.env.DEV_MODE === "1";

export const isServerMode = process.env.CLI_MODE === "server";
appEnv.CLI_MODE = process.env.CLI_MODE;

// console.log("env :>> ", env);
// console.log("process.env.CLI_MODE :>> ", process.env.CLI_MODE);

const table = new Table();
if (process.env.CLI_MODE === "server") {
	console.log(chalk.yellow(`------ process.env ------`));
	Object.entries(process.env).forEach(([key, val]) => {
		if (isNoEnvFile) {
			const value = _.truncate(val.toString(), { length: 60, separator: " " });
			if (key.indexOf("npm_") < -1) table.push([key, value]);
		} else {
			if (Object.keys(appEnv).includes(key)) {
				const value = _.truncate(val.toString(), { length: 60, separator: " " });
				table.push([key, value]);
			}
		}
	});
	console.log(table.toString());
}

export enum EnvName {
	DEVELOPMENT = "development",
	STAGING = "staging",
	CANARY = "canary",
	PRODUCTION = "production",
}

// Plugins
function toInt(obj: any, valueDefault: number) {
	return typeof obj !== "undefined" ? xobject.toInt(obj) : valueDefault;
}

function toBool(obj: any, valueDefault: boolean) {
	return typeof obj !== "undefined" ? xobject.toBool(obj) : valueDefault;
}

// Main config
export class Config {
	static grab = (key: string, defaultValue: any = "") => process.env[key] ?? defaultValue;

	static get ENV() {
		return EnvName[this.grab("NODE_ENV", "development").toUpperCase()] ?? EnvName.DEVELOPMENT;
	}

	static get BASE_PATH() {
		return process.env.BASE_PATH || "";
	}

	static getBasePath(extendedPath = "") {
		const { BASE_PATH } = this;
		return (BASE_PATH === "" ? BASE_PATH : `/${BASE_PATH}`) + extendedPath;
	}

	static get BASE_URL() {
		return process.env.BASE_URL || `http://localhost:${process.env.PORT}`;
	}

	static get PORT() {
		return process.env.PORT || 4000;
	}

	static get CLI_MODE() {
		return process.env.CLI_MODE || "client";
	}

	static get DX_SITE_URL() {
		return process.env.DX_SITE_URL
			? process.env.DX_SITE_URL
			: Config.ENV === "production"
			? "https://diginext.vn"
			: "https://diginext-website.dev.diginext.site";
	}

	static get DX_API_URL() {
		return process.env.DX_API_URL
			? process.env.DX_API_URL
			: Config.ENV === "production"
			? "https://diginext.vn/api"
			: "https://diginext-website.dev.diginext.site/api";
	}

	static get DX_LICENSE_KEY() {
		return process.env.DX_LICENSE_KEY;
	}

	static get BUILDER() {
		return process.env.BUILDER || "podman";
	}

	static get DISABLE_INPECT_MEMORY() {
		return toBool(process.env.DISABLE_INPECT_MEMORY, false);
	}

	static get SECONDS_INPECT_MEMORY() {
		return toInt(process.env.SECONDS_INPECT_MEMORY, 30);
	}

	static get REDIS_HOST() {
		return process.env.REDIS_HOST || "";
	}

	static get REDIS_PASS() {
		return process.env.REDIS_PASS || "";
	}

	static get CORS_WHITELIST() {
		return process.env.CORS_WHITELIST ? process.env.CORS_WHITELIST.split(";") : ["localhost", "192.168", "127.0", "digitop.vn"];
	}
}

// Extensions
export const IsDev = function () {
	return Config.ENV === EnvName.DEVELOPMENT;
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
