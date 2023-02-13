import { log } from "diginext-utils/dist/console/log";

import { isServerMode } from "@/app.config";
import type { Build } from "@/entities";
import { getIO } from "@/server";
import { BuildService } from "@/services";

import { fetchApi } from "../api";

export async function testBuild() {
	// let spawn = require("child_process").spawn;
	// let temp = spawn("docker", ["build", "-t", "digitop/test_image", "-f", "Dockerfile", "."]);
	// temp.stdio.forEach((io) => io.on("data", (data) => log(data.toString())));
	let socketServer = getIO();
	log("socketServer:", socketServer);
}

export async function saveLogs(buildSlug: string, logs: string) {
	if (!buildSlug) throw new Error(`Build's slug is required, it's empty now.`);
	if (isServerMode) {
		const buildSvc = new BuildService();
		const build = await buildSvc.update({ slug: buildSlug }, { logs });
		return build;
	} else {
		const { data: updatedBuilds } = await fetchApi<Build>({ url: `/api/v1/build?slug=${buildSlug}`, data: { logs } });
		const updatedBuild = updatedBuilds && (updatedBuilds as Build[]).length > 0 ? updatedBuilds[0] : undefined;
		return updatedBuild;
	}
}
