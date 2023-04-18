import { MongoDB } from "./mongodb";

export function traverseObjectAndTransformValue(obj: any, transform: (keyPair: [key: string, val: any]) => any) {
	if (
		typeof obj === "string" ||
		typeof obj === "number" ||
		typeof obj === "boolean" ||
		typeof obj === "function" ||
		obj instanceof Date ||
		MongoDB.isObjectId(obj)
	) {
		return obj;
	} else if (typeof obj === "object" && obj !== null) {
		for (const key in obj) {
			const value = obj[key];
			if (typeof value === "object" && value !== null) {
				obj[key] = traverseObjectAndTransformValue(value, transform);
			} else {
				obj[key] = transform([key, value]);
			}
		}
		// return obj;
	} else {
		return obj;
	}
}

export function replaceObjectIdsToStrings(obj: any): any {
	return JSON.parse(JSON.stringify(obj));
}
