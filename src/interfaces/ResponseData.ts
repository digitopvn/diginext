import { isArray, isString } from "lodash";

export interface ResponseData {
	/**
	 * 1 = succeed | 0 = failed
	 */
	status: 1 | 0;
	data: any;
	/**
	 * Error/warning messages
	 */
	messages: string[];
}

export const respondFailure = (params: { data?: any; msg?: string } | string | string[]) => {
	if (isString(params)) return { status: 0, messages: [params] } as ResponseData;
	if (isArray(params)) return { status: 0, messages: params } as ResponseData;

	const { msg = "Unexpected error.", data } = params;
	return { status: 0, data, messages: [msg] } as ResponseData;
};

export const respondSuccess = (params: { data?: any; msg?: string | string[] }) => {
	const { msg = "Ok.", data } = params;

	if (isArray(msg)) return { status: 1, data, messages: msg } as ResponseData;

	return { status: 1, data, messages: [msg] } as ResponseData;
};
