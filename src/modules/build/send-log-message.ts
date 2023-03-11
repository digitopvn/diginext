import chalk from "chalk";
import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import stripAnsi from "strip-ansi";

import { Logger } from "@/plugins";
import { socketIO } from "@/server";

import { saveLogs } from "./build";

type LogMessageOpts = {
	type?: "log" | "warn" | "error" | "success";
	logger?: Logger;
	SOCKET_ROOM: string;
	message: string;
};

export function sendLog(options: LogMessageOpts) {
	const { logger, SOCKET_ROOM, message, type = "log" } = options;

	const messageWithoutANSI = stripAnsi(chalk.reset(message));

	switch (type) {
		case "error":
			logger?.append("[ERROR] " + messageWithoutANSI);
			logError(`[SOCKET_ROOM: ${SOCKET_ROOM}] :>>`, message);
			break;
		case "warn":
			logger?.append("[WARN] " + messageWithoutANSI);
			logWarn(`[SOCKET_ROOM: ${SOCKET_ROOM}] :>>`, message);
			break;
		case "success":
			logger?.append("[SUCCESS] " + messageWithoutANSI);
			logSuccess(`[SOCKET_ROOM: ${SOCKET_ROOM}] :>>`, message);
			break;
		default:
			logger?.append("[LOG] " + messageWithoutANSI);
			log(`[SOCKET_ROOM: ${SOCKET_ROOM}] :>>`, message);
			break;
	}

	socketIO?.to(SOCKET_ROOM).emit("message", { action: "log", message: messageWithoutANSI });

	// save logs to database
	saveLogs(SOCKET_ROOM, logger.content ?? Logger.getLogs(SOCKET_ROOM));
}
