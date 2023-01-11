import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import { logError } from "diginext-utils/dist/console/log";
const Agent = require("agentkeepalive");
const HttpsAgent = require("agentkeepalive").HttpsAgent;

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

export interface FetchApiResponse<T extends Object> {
	status?: 0 | 1;
	messages?: string[];
	data?: T | T[];
}

export async function fetchApi<T = any>(options: AxiosRequestConfig & { access_token?: string; data?: T }) {
	const { access_token, method } = options;

	const { buildServerUrl = process.env.BASE_URL, currentUser, access_token: cachedAccessToken } = getCliConfig();

	if (!buildServerUrl) {
		logError(`"BUILD SERVER URL" not found. Please login with: "di login <BUILD_SERVER_URL>"`);
		return {
			status: 0,
			messages: [`"BUILD SERVER URL" not found. Please login with: "di login <BUILD_SERVER_URL>"`],
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
	}

	if (["POST", "PATCH"].includes(method?.toUpperCase())) {
		if (!options.headers["content-type"]) options.headers["content-type"] = "application/x-www-form-urlencoded";
	}

	if (options.data) options.data = new URLSearchParams(options.data);

	try {
		const { data: responseData } = await axios(options);

		// save new "access_token" if any:
		// TODO: this is not safe -> should use refresh token!
		// if (responseData.token?.access_token != cachedAccessToken && responseData.token?.access_token != "") {
		// 	saveCliConfig({ access_token: responseData.token?.access_token });
		// }

		// log(`fetchApi > response :>>`, responseData);
		return responseData as FetchApiResponse<T>;
	} catch (e) {
		logError(`${options.method} - ${options.url} - ERROR:`, e);
		return { status: 0, messages: [`Something went wrong: ${e.toString()}`], data: null } as FetchApiResponse<T>;
	}
}

export default fetchApi;
