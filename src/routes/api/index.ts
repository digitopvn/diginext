import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { log, logWarn } from "diginext-utils/dist/console/log";
import { Response } from "diginext-utils/dist/response";
import express from "express";

import pkg from "@/../package.json";
import { Config } from "@/app.config";
import { listImages } from "@/build/system";
import { sendMessage } from "@/modules/build";
import { testBuild } from "@/modules/build/build";
import { startBuild } from "@/modules/build/start-build";
import { execCmd } from "@/plugins";
// import userRouter from "./user";

const CLI_MODE = Config.grab("CLI_MODE", "client");

dayjs.extend(localizedFormat);

// initialize socket io server:
// let io;
// export const getIO = () => io;

// if (server) {
// 	io = new Server(server);
// 	global.socketServer = io;
// }

const router = express.Router();

/**
 * Default route - HOME
 */
router.get("/", (req, res) => {
	let str = "<h1>Diginext Build Server</h1>";
	str += "<li><em>Version: " + pkg.version + "</em></li>";
	str += "<li><em>Today: " + dayjs().format("LLLL") + "</em></li>";
	res.send(str);
});

/**
 * Health check route
 */
router.get("/healthz", (req, res) => Response.succeed(res));

/**
 * Register API routes
 */
if (CLI_MODE == "server") {
	logWarn(`You're running on SERVER mode.`);

	router.get("/hello", (req, res) => {
		res.status(200).json({ status: "Ok" });
	});

	router.get("/images", (req, res) => {
		listImages()
			.then((list) => res.send("<p>" + list + "</p>"))
			.catch((e) => res.send(`Error: ${e.message}`));
	});

	router.get("/send-message", (req, res) => {
		const { room, message } = req.query;
		// log(io);
		// io.to("2021-08-18-18-33-20").emit("message", { action: "start", message: "Hello" });

		sendMessage({ SOCKET_ROOM: room.toString(), message: message.toString() });

		res.send("done");
	});

	router.get("/build-test", (req, res) => {
		testBuild();
		res.send("done");
	});

	router.get("/docker/healthz", async (req, res) => {
		const resullt = await execCmd(`docker version --format "{{json .}}" | jq`);
		res.send(resullt);
	});

	router.get("/docker/images", async (req, res) => {
		const result = await execCmd(`docker images --format "{{json .}}" | jq --slurp`);
		res.send(result);
	});

	router.get("/docker/containers", async (req, res) => {
		const result = await execCmd(`docker ps --format "{{json .}}" | jq --slurp`);
		res.send(result);
	});

	router.post("/deploy", (req, res) => {
		const { options } = req.body;
		const cliOptions = JSON.parse(options);
		log("[API] cliOptions", cliOptions);

		// start build in background:
		startBuild(cliOptions);

		res.status(200).json({ status: 1 });
	});
}

export default router;
