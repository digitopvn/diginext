import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import execa from "execa";

import { Logger } from "../plugins/logger";
import { logInfo, logSuccess } from "../plugins/utils";

export async function listImages() {
	const logger = new Logger(`server-images-${makeDaySlug()}`);

	// const { stdout } = await execa("docker", ["images", "--format", `"{{json . }}"`, "|", "jq", "--slurp"]);
	const { stdout } = await execa.command(`docker images`);

	logInfo(`---> SERVER LIST IMAGES`);
	logInfo(stdout);

	logger.append(stdout);

	// convert to json:

	const jsonList = await execa.command(`docker images --format "{{json . }}"`);
	const imgArr = jsonList.stdout.split("\n");
	// logInfo(imgArr);
	const json = imgArr.map((line) => JSON.parse(line));

	return JSON.stringify(json, null, 2);
}

export async function cleanUp() {
	const logger = new Logger(`server-cleanup-${makeDaySlug()}`);

	const { stdout } = await execa("docker", ["image", "prune", "-af", "--filter", "until=72h"]);

	logInfo(`---> SERVER CLEAN UP`);
	logInfo(stdout);

	logger.append(stdout);

	logSuccess(`Cleaned up build server successfully.`);

	return true;
}
