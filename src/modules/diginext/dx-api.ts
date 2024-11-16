import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import chalk from "chalk";
import { isEmpty } from "lodash";

import { Config } from "@/app.config";
import type { ResponseData } from "@/interfaces";

export async function dxApi<T = ResponseData>(options: AxiosRequestConfig & { dxKey?: string; isDebugging?: boolean }) {
	const { method, dxKey } = options;

	// timeout: 30s
	options.timeout = 30000;

	if (isEmpty(options.headers)) options.headers = {};
	// console.log("DXKEY :", dxKey);

	options.baseURL = Config.DX_API_URL;
	// options.headers.Authorization = `Bearer ${licenseKey}`;
	if (dxKey) options.headers["X-API-Key"] = dxKey;
	// console.log("HEADER OPTIONS:", options.headers["X-API-Key"]);

	if (["POST", "PATCH", "DELETE"].includes(method?.toUpperCase())) {
		if (isEmpty(options.headers["content-type"])) options.headers["content-type"] = "application/json";
	}

	if (options.isDebugging && options.data) {
		console.log(chalk.yellow("dxApi() >"), `${Config.DX_API_URL}${options.url} > options.data :>>`);
		console.dir(options.data, { depth: 10 });
	}
	if (options.isDebugging) console.log(chalk.yellow("dxApi() >"), `${Config.DX_API_URL}${options.url} > options.headers :>>`, options.headers);

	try {
		const res = await axios(options);
		const { data } = res;
		if (options.isDebugging) console.log(chalk.yellow("dxApi() >"), `${Config.DX_API_URL}${options.url} > response :>>`, data);
		return { status: 1, data, messages: [] } as T;
	} catch (e) {
		console.log(chalk.yellow("dxApi() > Error :>>"), e);
		const err: string = e.data?.message === "UNAUTHORIZED" || e.data?.status === 401 ? "UNAUTHORIZED." : e.message;
		return { status: 0, messages: [`${err}`] } as T;
		// retry with backup url
		// options.baseURL = Config.DX_SITE_BACKUP_URL;
		// try {
		// 	const res = await axios(options);
		// 	const { data: responseData } = res;
		// 	if (options.isDebugging)
		// 		console.log(chalk.yellow("[BACKUP] dxApi() >"), `${Config.DX_SITE_BACKUP_URL}${options.url} > response :>>`, responseData);
		// } catch (e2) {
		// 	// throw official error
		// 	const err: string = e.data?.message === "UNAUTHORIZED" || e.data?.status === 401 ? "UNAUTHORIZED." : e.message;
		// 	return { status: 0, messages: [`${err}`] } as T;
		// }
	}
}
