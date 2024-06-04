import _, { isArray } from "lodash";

import type { IRole, IUser } from "@/entities";

export interface MaskOptions {
	/**
	 * @default *
	 */
	char?: string;
}

export const basicUserFields = ["_id", "id", "name", "slug", "verified", "image", "createdAt", "updatedAt"];

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

export const maskSensitiveInfo = (data: any, user: IUser, role?: IRole, route?: string) => {
	// console.log("[mask-sensitive-info] typeof data :>> ", typeof data);
	// console.log("[mask-sensitive-info] route :>> ", route);

	if (route.indexOf("/api_key") > -1) return data; // <-- exclude masking data for some specific routes
	if (typeof data === "boolean" || typeof data === "number" || typeof data === "string") return data;

	// console.log("[mask-sensitive-info] user :>> ", user);
	// console.log("[mask-sensitive-info] user.name :>> ", user.name);

	// parse role
	// console.log("[mask-sensitive-info] user.activeRole :>> ", user.activeRole);

	if ((user.activeRole as IRole)?._id) role = user.activeRole as IRole;

	// console.log("[mask-sensitive-info] role :>> ", role);

	if (!role) return;

	const maskedFields = role?.maskedFields || [];
	// console.log("[mask-sensitive-info] maskedFields :>> ", maskedFields);

	// mask fields
	if (isArray(data)) {
		data = data.map((item) => {
			/**
			 * ONLY Mask fields for NOT-owned items
			 */
			// if (!isOwned(item, user)) {
			// 	maskedFields.map((maskedField) => {
			// 		if (_.has(item, maskedField)) item = _.set(item, maskedField, "");
			// 	});
			// }

			/**
			 * Mask all fields
			 */
			maskedFields.map((maskedField) => {
				if (_.has(item, maskedField)) item = _.set(item, maskedField, "***");
			});
			return item;
		});
	} else {
		/**
		 * ONLY Mask fields for NOT-owned items
		 */
		// if (!isOwned(data, user))
		// 	maskedFields.map((maskedField) => {
		// 		if (_.has(data, maskedField)) data = _.set(data, maskedField, "");
		// 	});

		/**
		 * Mask all fields
		 */
		maskedFields.map((maskedField) => {
			if (_.has(data, maskedField)) data = _.set(data, maskedField, "");
		});
	}

	return data;
};
