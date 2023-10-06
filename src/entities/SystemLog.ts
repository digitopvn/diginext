import { model, Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { LogType } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export /**
 * An interface that extends IBase and describes the properties of an activity.
 *
 * @interface ISystemLog
 * @extends {IBase}
 */
interface ISystemLog extends IBase {
	/**
	 * The name of the log.
	 *
	 * @type {string}
	 * @memberof ISystemLog
	 */
	name?: string;

	/**
	 * The type of the log.
	 *
	 * @type {LogType}
	 * @memberof ISystemLog
	 */
	type?: LogType;

	/**
	 * A message associated with the log.
	 *
	 * @type {string}
	 * @memberof ISystemLog
	 */
	message?: string;

	/**
	 * The prioritized level of the log:
	 * - `1` -> DEBUG: diagnostic information, intended debug message.
	 * - `2` -> WARN: detected an unexpected application problem, might or might not harm the application in the future.
	 * - `3` -> ERROR: failure of something important in your application
	 * - `4` -> FATAL: a serious problem or corruption is happening.
	 *
	 * @type {1 | 2 | 3 | 4}
	 * @memberof ISystemLog
	 */
	level?: 1 | 2 | 3 | 4;
}

export type SystemLogDto = Omit<ISystemLog, keyof HiddenBodyKeys>;

export const systemLogSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: String,
		message: String,
		type: String,
		level: Number,
	},
	{ collection: "system_logs", timestamps: true }
);

export const SystemLogModel = model<ISystemLog>("SystemLog", systemLogSchema, "system_logs");
