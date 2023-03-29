import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import { isEmpty } from "lodash";

import { Config } from "@/app.config";
import type { ResponseData } from "@/interfaces";

export async function dxApi<T = ResponseData>(options: AxiosRequestConfig) {
	const { method } = options;

	const licenseKey = Config.DX_LICENSE_KEY;

	if (isEmpty(options.headers)) options.headers = {};
	if (!licenseKey) return { status: 0, messages: [`Diginext License Key is required.`] } as T;

	options.baseURL = Config.DX_API_URL;

	options.headers.Authorization = `Bearer ${licenseKey}`;

	if (["POST", "PATCH", "DELETE"].includes(method?.toUpperCase())) {
		if (isEmpty(options.headers["content-type"])) options.headers["content-type"] = "application/json";
	}

	// if (options.data) options.data = new URLSearchParams(options.data);
	// console.log(`dxApi: ${options.url} > options.headers :>>`, options.headers);

	try {
		const res = await axios(options);
		// console.log("[DX_API] res :>> ", res);
		const { data: responseData } = res;
		return responseData as T;
	} catch (e) {
		return { status: 0, messages: [`${e}`] } as T;
	}
}
