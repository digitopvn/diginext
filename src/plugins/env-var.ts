import { isBoolean, isDate, isNumber, isString } from "lodash";

import type { KubeEnvironmentVariable } from "@/interfaces/EnvironmentVariable";

export const formatEnvVars = (envVars: KubeEnvironmentVariable[]) => {
	return envVars.map(({ name, value }) => {
		if (isString(name) && isString(value)) return { name, value };
		if (isNumber(value) || isBoolean(value) || isDate(value)) return { name, value: value.toString() };

		let valueStr: string;
		// try to cast {Object} to {string}
		try {
			valueStr = JSON.stringify(value);
		} catch (e: any) {}

		return { name, value: valueStr ?? value?.toString() ?? "" };
	});
};
