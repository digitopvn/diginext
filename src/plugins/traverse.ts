import { isArray } from "lodash";

export const traverse = (obj: any, callback: (res: { key: string; val: any }) => void) => {
	for (let k in obj) {
		if (obj[k]) {
			if (isArray(obj[k])) {
				obj[k] = obj[k].map((item) => traverse(item, callback));
			} else if (typeof obj[k] === "object") {
				traverse(obj[k], callback);
			}
		}
		if (callback) callback({ key: k, val: obj[k] });
	}
	return obj;
};
