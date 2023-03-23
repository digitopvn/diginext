import chalk from "chalk";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";
import stripAnsi from "strip-ansi";

import { Logger } from "@/plugins";
import { socketIO } from "@/server";

import { saveLogs } from "./build";

dayjs.extend(localizedFormat);

type LogMessageOpts = {
	type?: "log" | "warn" | "error" | "success";
	SOCKET_ROOM: string;
	message: string;
};

export function sendLog(options: LogMessageOpts) {
	const { SOCKET_ROOM, message, type = "log" } = options;

	const logger = new Logger(SOCKET_ROOM);

	const now = dayjs().format("llll");
	const messageWithoutANSI = now + " - " + stripAnsi(chalk.reset(message));

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
	const logContent = logger.content ?? Logger.getLogs(SOCKET_ROOM);
	if (logContent) saveLogs(SOCKET_ROOM, logger.content ?? Logger.getLogs(SOCKET_ROOM));
}
