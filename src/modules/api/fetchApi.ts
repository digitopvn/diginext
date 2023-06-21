import Agent, { HttpsAgent } from "agentkeepalive";
import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import { logError } from "diginext-utils/dist/xconsole/log";
import { url } from "inspector";

import { getCliConfig } from "@/config/config";

const keepAliveAgent = new Agent({
	maxSockets: 160,
	maxFreeSockets: 160,
	timeout: 60000,
	freeSocketTimeout: 30000,
	keepAliveMsecs: 60000,
});

const httpsKeepAliveAgent = new HttpsAgent({
	maxSockets: 160,
	maxFreeSockets: 160,
	timeout: 60000,
	freeSocketTimeout: 30000,
	keepAliveMsecs: 60000,
});

interface FetchApiOptions<T = any> extends AxiosRequestConfig {
	url: string;
	access_token?: string;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	data?: T | any;
}

export interface FetchApiResponse<T extends Object> {
	status?: 0 | 1;
	messages?: string[];
	data?: T | T[];
}

export async function fetchApi<T = any>(options: FetchApiOptions<T>) {
	const { access_token, method = "GET" } = options;

	const { buildServerUrl = process.env.BASE_URL, currentUser, access_token: cachedAccessToken } = getCliConfig();

	if (!buildServerUrl) {
		logError(`"BUILD SERVER URL" not found. Please login with: "dx login <BUILD_SERVER_URL>"`);
		return {
			status: 0,
			messages: [`"BUILD SERVER URL" not found. Please login with: "dx login <BUILD_SERVER_URL>"`],
			data: null,
		} as FetchApiResponse<T>;
	}

	options.baseURL = buildServerUrl;
	options.maxContentLength = 200000000;
	options.maxBodyLength = 200000000;
	options.httpAgent = keepAliveAgent;
	options.httpsAgent = httpsKeepAliveAgent;

	if (access_token) {
		options.headers = { ...options.headers, Authorization: `Bearer ${access_token}` };
	} else if (cachedAccessToken) {
		options.headers = { ...options.headers, Authorization: `Bearer ${cachedAccessToken}` };
	} else if (currentUser?.token?.access_token) {
		options.headers = { ...options.headers, Authorization: `Bearer ${currentUser.token?.access_token}` };
	} else {
		options.headers = { ...options.headers };
	}

	if (["POST", "PATCH"].includes(method?.toUpperCase())) {
		// if (!options.headers["content-type"]) options.headers["content-type"] = "application/x-www-form-urlencoded";
		if (!options.headers["content-type"]) options.headers["content-type"] = "application/json";
	}

	if (options.data) options.data = JSON.stringify(options.data);
	// if (options.data) options.data = new URLSearchParams(options.data);
	// console.log("options.data :>> ", options.data);

	try {
		const { data: responseData } = await axios(options);
		return responseData as FetchApiResponse<T>;
	} catch (e) {
		if (e.toString().indexOf(`ECONNREFUSED`) > -1) {
			logError(`NETWORK ERROR: Cannot connect to the build server at "${url}".`);
		} else {
			logError(`${options.method} - ${options.url} - API ERROR:`, e);
		}
		return { status: 0, messages: [`Something went wrong: ${e.toString()}`], data: null } as FetchApiResponse<T>;
	}
}

export default fetchApi;
