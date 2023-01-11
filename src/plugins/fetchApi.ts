import axios from "axios";
// import qs from "querystring";

let API_BASE_PATH = "https://dev1.digitop.vn/digirelease";
// API_BASE_PATH = "http://192.168.1.10:3000";
API_BASE_PATH = "https://digirelease.digitop.vn";

export const DIGIRELEASE_URL = "https://digirelease.digitop.vn";

/**
 * @param  {Object} props
 * @param  {String} props.path
 * @param  {('GET'|'POST'|'PATCH'|'DELETE'|'PUT')} props.method="GET"
 * @param  {Object} props.data - Body object of the request
 * @param  {String} props.token - The token to add in the auth header -> "Bearer {TOKEN}"
 * @param  {Object} props.headers={}
 * @param  {Object} props.params - Extra parameters of AXIOS
 * @return {Promise<{status:Number,messages:[String],data:Object}>} - Response data in JSON format
 */

type fetchOptions = {
	path: string;
	method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
	data?: any;
	/**
	 * The token to add in the auth header -> "Bearer {TOKEN}"
	 */
	token?: string;
	headers?: any;
	params?: any;
};

const fetchApi = async (options: fetchOptions) => {
	const { path, token, method = "GET", data = {}, headers = {}, params = {} } = options;

	let api;
	// const url = API_BASE_PATH + path;
	const url = path;
	let axiosOption = {
		url: url,
		method: method,
		headers: { ...headers },
		params: { ...params },
		data: {},
	};

	if (method.toUpperCase() == "GET") {
		// nothing?
	} else {
		// trackingFormUrl(form, data);
		axiosOption.headers = {
			...axiosOption.headers,
			// "Content-Type": "application/x-www-form-urlencoded",
			"Content-Type": "application/json",
		};
		// axiosOption.data = qs.stringify(form);
		axiosOption.data = data;
	}

	if (token) axiosOption.headers.Authorization = "Bearer " + token;

	try {
		api = await axios(axiosOption);
	} catch (e) {
		api = e.response;
	}

	if (!api) {
		// ERROR
		api = {
			data: {
				status: 0,
				messages: [`[API ERROR - ${method.toUpperCase()}] Can't connect to [${url}]. Please contact your IT support.`],
				data: {},
			},
		};
		return api.data;
	} else {
		return api.data;
	}
};

export { fetchApi };
