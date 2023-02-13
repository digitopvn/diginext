import { log } from "diginext-utils/dist/console/log";

import type { Logger } from "@/plugins";
import { getIO } from "@/server";

type LogMessageOpts = {
	logger?: Logger;
	SOCKET_ROOM: string;
	message: string;
};

export function sendMessage(options: LogMessageOpts) {
	const { logger, SOCKET_ROOM, message } = options;
	if (logger) logger.append(message);
	log(message);

	let socketServer = getIO();
	if (socketServer) socketServer.to(SOCKET_ROOM).emit("message", { action: "log", message: message });
}
