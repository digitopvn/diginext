import { log } from "diginext-utils/dist/console/log";

// import PQueue from "p-queue";
import { getIO } from "@/server";

// export let queue = new PQueue({ concurrency: 1 });

export async function testBuild() {
	// let spawn = require("child_process").spawn;
	// let temp = spawn("docker", ["build", "-t", "digitop/test_image", "-f", "Dockerfile", "."]);
	// temp.stdio.forEach((io) => io.on("data", (data) => log(data.toString())));
	let socketServer = getIO();
	log("socketServer:", socketServer);
}
