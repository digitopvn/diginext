import { log } from "diginext-utils/dist/console/log";

import type { Build } from "@/entities";
import { getIO } from "@/server";

import { DB } from "../api/DB";

export async function testBuild() {
	// let spawn = require("child_process").spawn;
	// let temp = spawn("docker", ["build", "-t", "digitop/test_image", "-f", "Dockerfile", "."]);
	// temp.stdio.forEach((io) => io.on("data", (data) => log(data.toString())));
	let socketServer = getIO();
	log("socketServer:", socketServer);
}

/**
 * Save build log content to database
 */
export async function saveLogs(buildSlug: string, logs: string) {
	if (!buildSlug) throw new Error(`Build's slug is required, it's empty now.`);
	const [build] = await DB.update<Build>("build", { slug: buildSlug }, { logs });
	return build;
}
