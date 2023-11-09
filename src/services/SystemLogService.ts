import { logError } from "diginext-utils/dist/xconsole/log";

import { type ISystemLog, systemLogSchema } from "@/entities/SystemLog";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export type SaveLogOptions = Pick<ISystemLog, "type" | "level" | "name"> & Partial<Ownership>;

export class SystemLogService extends BaseService<ISystemLog> {
	constructor(ownership?: Ownership) {
		super(systemLogSchema, ownership);
	}

	async saveLog(message: string | undefined, options: SaveLogOptions = {}) {
		if (typeof message === "undefined") return;
		if (typeof options.level === "undefined") options.level = 1;
		if (typeof options.type === "undefined") options.type = "debug";

		const log = await this.create({ message, ...options });

		// check expired logs and deleted expired ones
		this.deleteExpiredLogs();

		return log;
	}

	async saveError(error: any, options?: SaveLogOptions) {
		logError(error.stack);
		return this.saveLog(error.stack, { ...options, level: 3, type: "error" });
	}

	async deleteExpiredLogs() {
		console.log("deleteExpiredLogs > this.workspace :>> ", this.workspace);
		const { type, value } = this.workspace?.settings?.system_log?.retention || {};
		if (!type && !value) return;

		console.log(`Deleting expired logs...`);

		const now = new Date();
		if (type === "duration") {
			// Mark as deleted based on duration
			const thresholdDate = new Date(Date.now() - value);

			// Count system logs that would be marked as deleted
			return this.model
				.countDocuments({
					createdAt: { $lt: thresholdDate },
					deletedAt: null,
				})
				.then((toDeleteCount) => {
					console.log(`${toDeleteCount} system logs will be marked as deleted based on duration.`);

					// Now, perform the update if there are any system logs to be marked as deleted
					if (toDeleteCount > 0) {
						return this.model.updateMany(
							{
								createdAt: { $lt: thresholdDate },
								deletedAt: null,
							},
							{
								$set: { deletedAt: new Date() },
							}
						);
					}
				})
				.catch((e) => {
					console.error(`Unable to delete expired logs:`, e);
				});
		} else if (type === "limit") {
			// Mark as deleted based on item count
			return this.model
				.countDocuments({ deletedAt: null })
				.then((count) => {
					const itemsToDelete = count - value;
					if (itemsToDelete > 0) {
						// We need to delete the oldest items, so we sort by 'createdAt'
						return this.model
							.find({ deletedAt: null })
							.sort({ createdAt: 1 })
							.limit(itemsToDelete)
							.then((docs) => {
								const idsToDelete = docs.map((doc) => doc._id);
								return this.model.updateMany({ _id: { $in: idsToDelete } }, { $set: { deletedAt: now } });
							})
							.catch((e) => {
								console.error(`Unable to delete expired logs:`, e);
							});
					}
				})
				.catch((e) => {
					console.error(`Unable to delete expired logs:`, e);
				});
		}
	}
}
