import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import { isEmpty } from "lodash";

import { Config } from "@/app.config";
import type { ResponseData } from "@/interfaces";

export async function dxApi<T = ResponseData>(options: AxiosRequestConfig & { dxKey?: string }) {
	const { method, dxKey } = options;

	if (isEmpty(options.headers)) options.headers = {};

	options.baseURL = Config.DX_API_URL;

	// options.headers.Authorization = `Bearer ${licenseKey}`;
	if (dxKey) options.headers["X-API-Key"] = dxKey;

	if (["POST", "PATCH", "DELETE"].includes(method?.toUpperCase())) {
		if (isEmpty(options.headers["content-type"])) options.headers["content-type"] = "application/json";
	}

	// if (options.data) options.data = new URLSearchParams(options.data);
	// console.log(`dxApi: ${options.url} > options.headers :>>`, options.headers);

	try {
		const res = await axios(options);
		const { data: responseData } = res;
		return responseData as T;
	} catch (e) {
		console.log("e :>> ", e);
		const err: string = e.response || e.data?.message === "UNAUTHORIZED" || e.data?.status === 401 ? "Invalid DX Key." : e.message;
		return { status: 0, messages: [`${err}`] } as T;
	}
}
