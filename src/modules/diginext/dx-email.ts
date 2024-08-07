import { IsTest } from "@/app.config";
import type { ResponseData } from "@/interfaces";

import { dxApi } from "./dx-api";

export type SendEmailOptions = {
	/**
	 * Array of the recipient's info
	 */
	recipients: { name?: string; email: string }[];
	subject: string;
	content: string;
};

export type SendDiginextEmailResponse = ResponseData & {
	data: { succeed?: number; failure?: number };
};

export async function dxSendEmail(params: SendEmailOptions, dxKey: string, options?: { isDebugging?: boolean }) {
	if (IsTest()) return { status: 1, data: { succeed: 1, failure: 0 } } as SendDiginextEmailResponse;
	return dxApi<SendDiginextEmailResponse>({ url: "/email/send", data: params, method: "POST", dxKey, isDebugging: options?.isDebugging });
}
