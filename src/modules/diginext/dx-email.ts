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

export async function sendDxEmail(params: SendEmailOptions, dxKey: string) {
	return dxApi<SendDiginextEmailResponse>({ url: "/email/send", data: params, method: "POST", dxKey });
}
