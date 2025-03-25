import { isArray } from "lodash";

import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";

export const formatEnvVars = (envVars: KubeEnvironmentVariable[]) => {
	/**
	 * {Object} envVars
	 * @example
	 * {
	 * 		"0": { name: "NAME", value: "VALUE" },
	 * 		"1": { name: "NAME", value: "VALUE" },
	 * 		...
	 * }
	 */
	// check if envVars is an object
	if (!isArray(envVars)) envVars = Object.values(envVars);

	// convert envVars to array of { name, value }
	return envVars.map(({ name, value }) => {
		return { name, value: value.toString() };
		// if (isString(name) && isString(value)) return { name, value };
		// if (isNumber(value) || isBoolean(value) || isDate(value)) return { name, value: value.toString() };

		// let valueStr: string;
		// // try to cast {Object} to {string}
		// try {
		// 	valueStr = JSON.stringify(value);
		// } catch (e: any) {}

		// return { name, value: valueStr ?? value?.toString() ?? "" };
	});
};
