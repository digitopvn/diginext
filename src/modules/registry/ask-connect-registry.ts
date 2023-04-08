import type { InputOptions } from "@/interfaces";

import { askForRegistry } from "./ask-for-registry";
import { connectRegistry } from "./connect-registry";

export const askToConnectRegistry = async (options?: InputOptions) => {
	const registry = await askForRegistry();

	// start connecting container registry...
	const result = await connectRegistry(registry, options);
	return result;
};
