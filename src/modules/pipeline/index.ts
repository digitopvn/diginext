import { logWarn } from "diginext-utils/dist/xconsole/log";

export * from "./pipeline.service";

export async function execPipeline(options) {
	logWarn(`This feature is under development.`);
	return options;
}
