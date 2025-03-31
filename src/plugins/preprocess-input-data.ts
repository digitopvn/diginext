import { isBooleanString, isJSON } from "class-validator";
import { toBool } from "diginext-utils/dist/object";
import { cloneDeepWith } from "lodash";
import { isValidObjectId } from "mongoose";

import { isObjectId, MongoDB, toObjectId } from "./mongodb";

export function preprocessInputData(data: any) {
	const processedData = cloneDeepWith(data, (val, key) => {
		// skip envVars
		if (key === "envVars") return val;

		// convert {ObjectId} to string
		if (isValidObjectId(val)) return MongoDB.toString(toObjectId(val));
		if (isObjectId(val)) return MongoDB.toString(val);
		// if (isNumberString(val)) return val.toString().length < 12 ? toNumber(val) : toString(val);

		// convert boolean string to boolean
		if (isBooleanString(val)) return toBool(val);

		// convert JSON string to object
		if (isJSON(val)) return JSON.parse(val);

		// convert "undefined" or "null" to null
		if (val === "undefined" || val === "null") return null;
	});
	return processedData;
}
