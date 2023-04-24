import { mapKeys } from "lodash";

/**
 * Flatten the object into 1-level-object (with key paths)
 * @example
 * const flattenObj = flattenObject({a: {b: [{c: 1}, {c: 2}]}, e: 3});
 * console.log(flattenObj); // {"a.b.0.c": 1, "a.b.1.c": 2, "e": 3}
 */
export function flattenObject(obj: Record<string, any>): Record<string, any> {
	const flattenKeys = (_obj: Record<string, any>, prefix = ""): Record<string, any> => {
		return Object.keys(_obj).reduce((acc, key) => {
			const newKey = prefix ? `${prefix}.${key}` : key;
			const value = _obj[key];
			if (typeof value === "object" && value !== null) {
				Object.assign(acc, flattenKeys(value, newKey));
			} else {
				acc[newKey] = value;
			}
			return acc;
		}, {} as Record<string, any>);
	};

	const flattenedObj = flattenKeys(obj);

	const mappedObj = mapKeys(flattenedObj, (value, key: string) => {
		const keys = key.split(".");
		const newKey = keys.join(".");
		return newKey;
	});

	return mappedObj;
}
