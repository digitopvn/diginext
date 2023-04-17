import { MongoDB } from "./mongodb";

export function traverseObjectAndTransformValue(obj: any, transform: (keyPair: [key: string, val: any]) => any) {
	if (typeof obj === "string") return obj;
	if (typeof obj === "number") return obj;
	if (typeof obj === "boolean") return obj;
	if (typeof obj === "function") return obj;

	for (const key in obj) {
		if (MongoDB.isObjectId(obj[key])) {
			obj[key] = transform([key, obj[key]]);
		} else {
			if (typeof obj[key] === "object" && obj[key] !== null) {
				traverseObjectAndTransformValue(obj[key], transform);
			} else {
				obj[key] = transform([key, obj[key]]);
			}
		}
	}

	return obj;
}
