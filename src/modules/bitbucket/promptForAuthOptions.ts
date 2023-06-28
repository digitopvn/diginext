import { logError } from "diginext-utils/dist/xconsole/log";

import type InputOptions from "@/interfaces/InputOptions";

// import { wait } from "@/plugins";
// import { conf } from "../..";

export async function bitbucketAuthentication(options: InputOptions) {
	logError(`Deprecated.`);
	return options;
}
