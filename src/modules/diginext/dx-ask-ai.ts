import { IsTest } from "@/app.config";
import type { ResponseData } from "@/interfaces";

import { dxApi } from "./dx-api";

export type AskAiMessage = {
	role: "user" | "system" | "assistant";
	content:
		| string
		| {
				type: "text";
				text: string;
		  }
		| {
				type: "image_url";
				text:
					| string
					| {
							url: string;
							detail?: string | undefined;
					  };
		  };
};

export type AskAiParams = {
	model?: string;
	messages: AskAiMessage[];
};

export type AskAiResponseData = {
	object: "chat.completion" | "chat.completion.chunk";
	model: string;
	id: string;
	choices: {
		message: {
			role: string;
			content: string | null;
		};
		finish_reason: string | null;
		error?:
			| {
					code: number;
					message: string;
			  }
			| undefined;
	}[];
	created: number;
	system_fingerprint: string;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
};

export type AskAiResponse = ResponseData & {
	data: AskAiResponseData;
};

export async function dxAskAi(params: AskAiParams, dxKey: string, options?: { isDebugging?: boolean }) {
	if (IsTest()) return { status: 1, data: { choices: [] } } as AskAiResponse;
	return dxApi<AskAiResponse>({ url: "/ask-ai", data: params, method: "POST", dxKey, isDebugging: options?.isDebugging });
}
