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
