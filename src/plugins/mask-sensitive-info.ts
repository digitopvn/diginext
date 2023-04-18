import _, { isArray } from "lodash";

import type { IRole } from "@/entities";

export interface MaskOptions {
	/**
	 * @default *
	 */
	char?: string;
}

export const mask = (str: string, leftUnmaskLength = 0, rightUnmaskLength?: number, options: MaskOptions = { char: "*" }) => {
	const { char } = options;

	if (rightUnmaskLength && rightUnmaskLength > str.length - leftUnmaskLength) rightUnmaskLength = str.length - leftUnmaskLength;

	const unmaskedFirst = leftUnmaskLength ? str.substring(0, leftUnmaskLength) : "";
	const unmaskedLast = rightUnmaskLength ? str.substring(str.length - rightUnmaskLength) : "";
	const toBeMaskedStr = str.substring(leftUnmaskLength, str.length - rightUnmaskLength);

	let maskedStr = "";
	for (let i = 0; i < toBeMaskedStr.length; i++) {
		maskedStr += char;
	}
	return `${unmaskedFirst}${maskedStr}${unmaskedLast}`;
};

export const maskSensitiveInfo = (data: any, role: IRole) => {
	if (typeof data === "boolean" || typeof data === "number" || typeof data === "string") return data;

	const maskedFields = role?.maskedFields || [];

	if (isArray(data)) {
		data = data.map((item) => {
			maskedFields.map((maskedField) => {
				if (_.has(item, maskedField)) item = _.set(item, maskedField, "");
			});
			return item;
		});
	} else {
		maskedFields.map((maskedField) => {
			if (_.has(data, maskedField)) data = _.set(data, maskedField, "");
		});
	}

	return data;
};
