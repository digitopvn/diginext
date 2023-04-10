interface MyObject {
	[key: string]: any;
}

export function traverseObjectAndTransformValue(obj: MyObject, transform: (keyPair: [key: string, val: any]) => any) {
	for (const key in obj) {
		if (typeof obj[key] === "object" && obj[key] !== null) {
			traverseObjectAndTransformValue(obj[key], transform);
		} else {
			obj[key] = transform([key, obj[key]]);
		}
	}
}
