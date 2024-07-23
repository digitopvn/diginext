import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { log, logSuccess } from "diginext-utils/dist/xconsole/log";

// import { execaCommand } from "execa";
import { Config } from "@/app.config";

import { Logger } from "../plugins/logger";
import { execCmd } from "../plugins/utils";

export async function listImages() {
	const logger = new Logger(`server-images-${makeDaySlug({ divider: "" })}`);

	const { execaCommand } = await import("execa");
	const { stdout } = await execaCommand(`docker images`);

	log(`---> SERVER LIST IMAGES`);
	log(`\n`, stdout);

	logger?.append(stdout);

	// convert to json:

	const jsonList = await execaCommand(`${Config.BUILDER} images --format "{{json .}}"`);
	const imgArr = jsonList.stdout.split("\n").map((line) => JSON.parse(line));

	return JSON.stringify(imgArr, null, 2);
}

export async function cleanUp() {
	const logger = new Logger(`server-cleanup-${makeDaySlug({ divider: "" })}`);

	let result;

	// Clean up docker system
	result = await execCmd(`${Config.BUILDER} system prune -af --filter name=buildx`);
	log(`>>> DOCKER SYSTEM HAVE BEEN CLEANED UP:`);
	log(result);
	logger?.append(result);

	logger?.append(`-------------------------`);
	logger?.append(`-------------------------`);

	// Clean up docker volumes
	result = await execCmd(`${Config.BUILDER} volume prune -f --filter until=72h`);
	log(`>>> DOCKER VOLUME HAVE BEEN CLEANED UP:`);
	log(result);
	logger?.append(result);

	logger?.append(`-------------------------`);
	logger?.append(`-------------------------`);

	// // Clean up docker images
	// result = await execCmd("docker image prune -af --filter until=72h");
	// log(`>>> DOCKER IMAGES HAVE BEEN CLEANED UP:`);
	// log(result);
	// logger?.append(result);

	// logger?.append(`-------------------------`);
	// logger?.append(`-------------------------`);

	// // Clean up docker build cache
	// result = await execCmd(`docker builder prune -af --filter until=72h`);
	// log(`>>> DOCKER BUILD CACHE HAS BEEN CLEANED UP:`);
	// log(result);
	// logger?.append(result);

	// log success message:
	logSuccess(`Cleaned up build server successfully.`);
	return true;
}
