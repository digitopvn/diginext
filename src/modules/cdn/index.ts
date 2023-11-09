import { logSuccess } from "diginext-utils/dist/xconsole/log";

import type { InputOptions } from "@/interfaces";

import { logHelp } from "../../plugins/utils";
import { disableCDN, enableCDN, loadVersionCacheCDNFromEnv, purgeProject, startUpload } from "./cdn.service";

export async function execCDN(options: InputOptions) {
	const { env = "dev" } = options;

	if (typeof options.targetDirectory == "undefined") options.targetDirectory = process.cwd();

	if (options.secondAction == "push") {
		const version = loadVersionCacheCDNFromEnv(options);
		console.log("Cache version: ", version);

		await startUpload({
			version,
			env: env,
			path: options.thirdAction,
			production: options.isProd,
			optimize: options.shouldCompress,
			isDebugging: options.isDebugging,
		});
	} else if (options.secondAction == "enable") {
		enableCDN({ env });
		logSuccess(`CDN của môi trường "${env}" đã được kích hoạt.`);
	} else if (options.secondAction == "disable") {
		disableCDN({ env });
		logSuccess(`CDN của môi trường "${env}" đã được tắt.`);
	} else if (
		options.secondAction == "purge" ||
		options.secondAction == "flush" ||
		options.secondAction == "clear-cache" ||
		options.secondAction == "clear"
	) {
		// purge cdn cache
		// await purgeAllCache({
		//   production: options.isProd,
		// });
		await purgeProject(options);
		logSuccess(`CDN của môi trường "${env}" đã được xoá cache.`);
	} else {
		logHelp();
	}
}
