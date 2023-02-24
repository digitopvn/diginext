import { log } from "diginext-utils/dist/console/log";

import { Logger } from "@/plugins";
import { getIO } from "@/server";

import { saveLogs } from "./build";

type LogMessageOpts = {
	logger?: Logger;
	SOCKET_ROOM: string;
	message: string;
};

export function sendMessage(options: LogMessageOpts) {
	const { logger, SOCKET_ROOM, message } = options;
	if (logger) logger.append(message);
	log(`[SOCKET_ROOM: ${SOCKET_ROOM}] :>>`, message);

	let socketServer = getIO();
	// log({ socketServer });
	if (socketServer) socketServer.to(SOCKET_ROOM).emit("message", { action: "log", message: message });

	// save logs to database
	saveLogs(SOCKET_ROOM, Logger.getLogs(SOCKET_ROOM));
}
