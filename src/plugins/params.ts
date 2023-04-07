export const paramsToObject = (params: URLSearchParams) => {
	const result = {} as any;
	for (const [key, value] of params) {
		// each 'entry' is a [key, value] tupple
		result[key] = value;
	}
	return result;
};
