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
				traverseObjectAndTransformValue(value, transform);
			} else {
				transform([key, value]);
			}
		}
		// return obj;
	} else {
		return obj;
	}
}

export function replaceStringsToObjectIds(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map((item) => replaceStringsToObjectIds(item));
	} else if (
		typeof obj === "string" ||
		typeof obj === "number" ||
		typeof obj === "boolean" ||
		typeof obj === "function" ||
		obj instanceof Date ||
		MongoDB.isObjectId(obj)
	) {
		return obj;
	} else if (MongoDB.isValidObjectId(obj)) {
		return MongoDB.toObjectId(obj);
	} else if (typeof obj === "object" && obj !== null) {
		for (const [key, value] of Object.entries(obj)) {
			obj[key] = replaceStringsToObjectIds(value);
		}
		// return obj;
	} else {
		return obj;
	}
}

export function replaceObjectIdsToStrings(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map((item) => replaceObjectIdsToStrings(item));
	} else if (MongoDB.isObjectId(obj)) {
		return obj.toString();
	} else if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean" || typeof obj === "function" || obj instanceof Date) {
		return obj;
	} else if (typeof obj === "object" && obj !== null) {
		for (const [key, value] of Object.entries(obj)) {
			obj[key] = replaceObjectIdsToStrings(value);
		}
		return obj;
	} else {
		return obj;
	}
}
