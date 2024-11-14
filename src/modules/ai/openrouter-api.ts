import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import { isEmpty } from "lodash";

import { Config } from "@/app.config";

export const OPENROUTER_BASE_API_URL = "https://openrouter.ai/api/v1";

export const aiModels = [
	"deepseek/deepseek-coder",
	"google/gemini-flash-1.5",
	"google/gemini-pro-1.5",
	"openai/gpt-4o",
	"openai/gpt-3.5-turbo",
	"openai/gpt-3.5-turbo-16k",
	"openai/gpt-4",
	"openai/gpt-4-32k",
	"anthropic/claude-3.5-sonnet",
	"anthropic/claude-2",
	"anthropic/claude-instant-v1",
	"meta-llama/llama-2-13b-chat",
	"meta-llama/llama-2-70b-chat",
	"qwen/qwen-2.5-coder-32b-instruct", // 2024-11-14
] as const;
export type AIModel = (typeof aiModels)[number];

export interface AIDto {
	model?: AIModel;
	messages: { role: "system" | "user"; content: string }[];
}

export interface OpenRouterResponseData {
	model: AIModel;
	choices: { message: { role: string; content: string } }[];
}

export async function aiApi<T = OpenRouterResponseData>(
	options: AxiosRequestConfig & { baseUrl?: string; apiKey?: string; data?: AIDto; isDebugging?: boolean }
) {
	if (!options.method) options.method = "POST";

	const { method } = options;

	options.baseURL = options.baseUrl || OPENROUTER_BASE_API_URL;
	if (!options.url) options.url = "/chat/completions";

	// default headers
	let headers: any = {
		"HTTP-Referer": Config.BASE_URL,
		"X-Title": `DIGINEXT (${Config.ENV})`,
	};
	if (!isEmpty(options.headers)) headers = { ...headers, ...options.headers };

	// Authentication
	const apiKey = options.apiKey || Config.grab("OPENROUTER_KEY");
	if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

	if (["POST", "PATCH", "DELETE"].includes(method?.toUpperCase())) {
		if (isEmpty(headers["content-type"])) headers["content-type"] = "application/json";
	}

	// if (options.data) options.data = new URLSearchParams(options.data);
	options.headers = headers;
	if (options.isDebugging) console.log(`aiApi: ${options.url} > headers :>>`, options.headers);
	if (options.isDebugging) console.log("aiApi: ${options.url} > options.data :>> ", options.data);
	if (options.isDebugging) console.log("aiApi: ${options.url} > options.method :>> ", options.method);

	try {
		const res = await axios(options);
		const { data: responseData } = res;
		if (options.isDebugging) console.log("aiApi: ${options.url} > data :>> ", responseData);
		return responseData as T;
	} catch (e) {
		if (options.isDebugging) console.log("aiApi: ${options.url} > e :>> ", e);
		if (options.isDebugging) console.log("aiApi: ${options.url} > e.response :>> ", e.response);
		if (options.isDebugging) console.log("aiApi: ${options.url} > e.data :>> ", e.data);
		if (options.isDebugging) console.log("aiApi: ${options.url} > e.message :>> ", e.message);
		const err: string = e.response || e.data?.message === "UNAUTHORIZED" || e.data?.status === 401 ? "Invalid API Key." : e.message;
		return { status: 0, messages: [`${err}`] } as T;
	}
}
