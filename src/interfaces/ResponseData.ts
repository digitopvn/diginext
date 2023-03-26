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

export const respondFailure = (params: { data?: any; msg?: string }) => {
	const { msg = "Unexpected error.", data } = params;
	return { status: 0, data, messages: [msg] } as ResponseData;
};

export const respondSuccess = (params: { data?: any; msg?: string }) => {
	const { msg = "Ok.", data } = params;
	return { status: 1, data, messages: [msg] } as ResponseData;
};
