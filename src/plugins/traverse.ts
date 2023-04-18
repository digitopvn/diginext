import { isJSON } from "class-validator";

import { MongoDB } from "./mongodb";

export function traverseObjectAndTransformValue(obj: any, transform: (keyPair: [key: string, val: any]) => any) {
	if (typeof obj === "string") return obj;
	if (typeof obj === "number") return obj;
	if (typeof obj === "boolean") return obj;
	if (typeof obj === "function") return obj;

	const newObj = Array.isArray(obj) ? [] : {};

	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			const value = obj[key];
			if (typeof value === "object" && value !== null) {
				newObj[key] = traverseObjectAndTransformValue(value, transform);
			} else {
				newObj[key] = transform([key, value]);
			}
		}
	}

	return newObj;
}

export function replaceStringsToObjectIds(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map((item) => replaceStringsToObjectIds(item));
	} else if (typeof obj === "object" && obj !== null) {
		const newObj = {};
		for (const [key, value] of Object.entries(obj)) {
			newObj[key] = replaceStringsToObjectIds(value);
			if (MongoDB.isValidObjectId(value)) {
				newObj[key] = MongoDB.toObjectId(value);
			} else if (MongoDB.isObjectId(value)) {
				newObj[key] = value;
			} else if (isJSON(value)) {
				newObj[key] = JSON.parse(value as string);
			}
		}
		return newObj;
	} else {
		return obj;
	}
}

export function replaceObjectIdsToStrings(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map((item) => replaceObjectIdsToStrings(item));
	} else if (typeof obj === "object" && obj !== null) {
		const newObj = {};
		for (const [key, value] of Object.entries(obj)) {
			newObj[key] = replaceObjectIdsToStrings(value);
			if (MongoDB.isObjectId(value)) {
				newObj[key] = value.toString();
			}
		}
		return newObj;
	} else {
		return obj;
	}
}
