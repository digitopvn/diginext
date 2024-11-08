import { isBooleanString, isJSON, isNumberString } from "class-validator";
import { toBool } from "diginext-utils/dist/object";
import { cloneDeepWith, toNumber, toString } from "lodash";
import { isValidObjectId } from "mongoose";

import { isObjectId, MongoDB, toObjectId } from "./mongodb";

export function preprocessInputData(data: any) {
	const processedData = cloneDeepWith(data, function (val) {
		if (isValidObjectId(val)) return MongoDB.toString(toObjectId(val));
		if (isObjectId(val)) return MongoDB.toString(val);
		if (isNumberString(val)) return val.toString().length < 12 ? toNumber(val) : toString(val);
		if (isBooleanString(val)) return toBool(val);
		if (isJSON(val)) return JSON.parse(val);
		if (val === "undefined" || val === "null") return null;
	});
	return processedData;
}
