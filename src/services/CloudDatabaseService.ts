import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { logError } from "diginext-utils/dist/xconsole/log";
import { existsSync } from "fs";
import { toString } from "lodash";
import path from "path";

import { Config } from "@/app.config";
import type { CloudDatabaseDto, ICloudDatabase } from "@/entities/CloudDatabase";
import { cloudDatabaseSchema } from "@/entities/CloudDatabase";
import type { ICloudDatabaseBackup } from "@/entities/CloudDatabaseBackup";
import type { CronjobRepeat, CronjobRequest, CronjonRepeatCondition } from "@/entities/Cronjob";
import { cronjobRepeatUnitList } from "@/entities/Cronjob";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";
import { respondFailure } from "@/interfaces";
import type { CloudDatabaseType, Ownership } from "@/interfaces/SystemTypes";
import { cloudDatabaseList } from "@/interfaces/SystemTypes";
import { createCronjobRepeat } from "@/modules/cronjob/schedule";
import MongoShell from "@/modules/db/mongo";
import MySQL from "@/modules/db/mysql";
import PostgreSQL from "@/modules/db/pg";
import { MongoDB } from "@/plugins/mongodb";
import { checkPermissionsByFilter } from "@/plugins/user-utils";

import BaseService from "./BaseService";
import { CloudDatabaseBackupService } from "./CloudDatabaseBackupService";

export type DatabaseConnectionInfo = {
	type: CloudDatabaseType;
	host: string;
	port?: string;
	/**
	 * @default root
	 */
	user?: string;
	pass: string;
};

export type DatabaseBackupParams = DatabaseConnectionInfo & {
	/**
	 * @default all-databases
	 */
	dbName?: string;
	/**
	 * For MongoDB only
	 * @default admin
	 */
	authDb?: string;
	/**
	 * Output directory
	 */
	outDir?: string;
};

export type DatabaseRestoreParams = {
	/**
	 * @default all-databases
	 */
	dbName?: string;
	/**
	 * For MongoDB only
	 * @default admin
	 */
	authDb?: string;
	/**
	 * Backup path
	 */
	path?: string;
};

export class CloudDatabaseService extends BaseService<ICloudDatabase> {
	constructor(ownership?: Ownership) {
		super(cloudDatabaseSchema, ownership);
	}

	async create(data: CloudDatabaseDto) {
		// validate
		if (!data.type) throw new Error(`Database type is required, should be one of: ${cloudDatabaseList.join(",")}.`);
		if (data.type !== "mongodb" && data.type !== "mariadb" && data.type !== "mysql" && data.type !== "postgresql")
			throw new Error(`Database type "" is not supported at the moment.`);

		if (data.type !== "mongodb" && data.type !== "postgresql" && !data.url) {
			if (!data.host) throw new Error(`Database host is required.`);
			if (!data.pass) throw new Error(`Password is required.`);
		}
		// console.log("data :>> ", data);
		// test connection
		let verified: boolean = false;

		try {
			switch (data.type) {
				case "mariadb":
				case "mysql":
					verified = await MySQL.checkConnection({ host: data.host, port: toString(data.port), user: data.user, pass: data.pass });
					break;
				case "mongodb":
					verified = await MongoShell.checkConnection({
						url: data.url,
						host: data.host,
						port: toString(data.port),
						user: data.user,
						pass: data.pass,
					});
					break;
				case "postgresql":
					verified = await PostgreSQL.checkConnection({ host: data.host, port: toString(data.port), user: data.user, pass: data.pass });
					break;
				default:
					console.warn(`Database type "${data.type}" is not supported at the moment.`);
					break;
			}
		} catch (e) {
			console.warn(e);
		}

		data.verified = verified;

		// insert
		const newDb = await super.create(data);
		if (!newDb) throw new Error(`Internal Server Error: Unable to create database: "${data.name}"`);
		return newDb;
	}

	async find(
		filter?: IQueryFilter<ICloudDatabase>,
		options?: IQueryOptions & IQueryPagination,
		pagination?: IQueryPagination
	): Promise<ICloudDatabase[]> {
		// check access permissions
		if (this.user?.allowAccess?.databases?.length > 0) filter = { $or: [filter, { _id: { $in: this.user?.allowAccess?.databases } }] };

		return super.find(filter, options, pagination);
	}

	async update(filter: IQueryFilter<ICloudDatabase>, data: any, options?: IQueryOptions): Promise<ICloudDatabase[]> {
		// check permissions
		await checkPermissionsByFilter("cloud_databases", this, filter, this.user);

		return super.update(filter, data, options);
	}

	async updateOne(filter: IQueryFilter<ICloudDatabase>, data: any, options?: IQueryOptions): Promise<ICloudDatabase> {
		// check permissions
		await checkPermissionsByFilter("cloud_databases", this, filter, this.user);

		return super.updateOne(filter, data, options);
	}

	async delete(filter?: IQueryFilter<ICloudDatabase>, options?: IQueryOptions): Promise<{ ok: boolean; affected: number }> {
		// check permissions
		await checkPermissionsByFilter("cloud_databases", this, filter, this.user);

		return super.delete(filter, options);
	}

	async softDelete(filter?: IQueryFilter<ICloudDatabase>, options?: IQueryOptions): Promise<{ ok: boolean; affected: number }> {
		// check permissions
		await checkPermissionsByFilter("cloud_databases", this, filter, this.user);

		return super.softDelete(filter, options);
	}

	// healthz
	async checkHealthById(id: string) {
		const { DB } = await import("@/modules/api/DB");
		const db = await DB.findOne("database", { _id: id });
		if (!db) throw new Error(`Cloud database not found.`);
		return this.checkHealth(db);
	}

	async checkHealth(db: ICloudDatabase) {
		// validate
		if (!db.type) throw new Error(`Database type is required, should be one of: ${cloudDatabaseList.join(",")}.`);
		if (db.type !== "mongodb" && db.type !== "mariadb" && db.type !== "mysql" && db.type !== "postgresql")
			throw new Error(`Database type "" is not supported at the moment.`);

		if (db.type !== "mongodb" && db.type !== "postgresql" && !db.url) {
			if (!db.host) throw new Error(`Database host is required.`);
			if (!db.pass) throw new Error(`Password is required.`);
		}

		// test connection
		let verified: boolean = false;

		try {
			switch (db.type) {
				case "mariadb":
				case "mysql":
					verified = await MySQL.checkConnection({ host: db.host, port: toString(db.port), user: db.user, pass: db.pass });
					break;
				case "mongodb":
					verified = await MongoShell.checkConnection({ host: db.host, port: toString(db.port), user: db.user, pass: db.pass });
					break;
				case "postgresql":
					verified = await PostgreSQL.checkConnection({ host: db.host, port: toString(db.port), user: db.user, pass: db.pass });
					break;
				default:
					console.warn(`Database type "${db.type}" is not supported at the moment.`);
					break;
			}
		} catch (e) {
			console.warn(e);
		}

		return verified;
	}

	async backupById(id: string) {
		const { DB } = await import("@/modules/api/DB");
		const db = await DB.findOne("database", { _id: id });
		if (!db) throw new Error(`Cloud database not found.`);
		return this.backup(db);
	}

	async backup(db: ICloudDatabase, options?: { dbName?: string; authDb?: string }) {
		// validate
		if (!db.type) throw new Error(`Database type is required, should be one of: ${cloudDatabaseList.join(",")}.`);
		if (db.type !== "mongodb" && db.type !== "mariadb" && db.type !== "mysql" && db.type !== "postgresql")
			throw new Error(`Database type "${db.type}" is not supported at the moment.`);

		if (db.type !== "mongodb" && db.type !== "postgresql" && !db.url) {
			if (!db.host) throw new Error(`Database host is required.`);
			if (!db.pass) throw new Error(`Password is required.`);
		}

		// backup
		try {
			const bkSvc = new CloudDatabaseBackupService();

			// check if this process has been done by other pods, if yes, ignore this.
			const bkName = `${db.type}-backup-${makeDaySlug()}`;
			let backup = await bkSvc.findOne({ name: bkName });
			if (backup) return;

			// create backup in db
			backup = await bkSvc.create({
				database: MongoDB.toString(db._id),
				status: "start",
				name: bkName,
				type: db.type,
				dbSlug: db.slug,
				// ownerships
				workspace: this.req.workspace._id as string,
				owner: this.req.user._id as string,
			});

			switch (db.type) {
				case "mariadb":
				case "mysql":
					MySQL.backup({ dbName: options?.dbName, host: db.host, port: toString(db.port), user: db.user, pass: db.pass })
						.then((res) => bkSvc.updateStatus(backup._id, { status: "success", path: res.path }))
						.catch((e) => (backup ? bkSvc.updateStatus(backup._id, { status: "failed" }) : undefined));
					break;
				case "mongodb":
					MongoShell.backup({
						dbName: options?.dbName,
						authDb: options?.authDb,
						url: db.url,
						host: db.host,
						port: toString(db.port),
						user: db.user,
						pass: db.pass,
					})
						.then((res) => bkSvc.updateStatus(backup._id, { status: "success", path: res.path }))
						.catch((e) => (backup ? bkSvc.updateStatus(backup._id, { status: "failed" }) : undefined));
					break;
				case "postgresql":
					PostgreSQL.backup({
						dbName: options?.dbName,
						url: db.url,
						host: db.host,
						port: toString(db.port),
						user: db.user,
						pass: db.pass,
					})
						.then((res) => bkSvc.updateStatus(backup._id, { status: "success", path: res.path }))
						.catch((e) => (backup ? bkSvc.updateStatus(backup._id, { status: "failed" }) : undefined));
					break;
				default:
					throw new Error(`Database type "${db.type}" is not supported backing up at the moment.`);
			}

			return backup;
		} catch (e) {
			logError(e);
			return;
		}
	}

	async restoreFromBackupId(backupId: string, dbId: string) {
		const bkSvc = new CloudDatabaseBackupService();
		const backup = await bkSvc.findOne({ _id: backupId });
		const db = await this.findOne({ _id: dbId });
		return this.restoreFromBackup(backup, db);
	}

	async restoreFromBackup(backup: ICloudDatabaseBackup, db: ICloudDatabase) {
		if (!backup.path) throw new Error(`Backup path is required.`);
		if (backup.path && !existsSync(path.resolve(backup.path)) && backup.url) {
			// download the backup url to server...
		} else {
			throw new Error(`Backup path is not existed.`);
		}
		const restoreParams: DatabaseRestoreParams = { path: backup.path };
		return this.restore({}, db);
	}

	async restoreById(options: DatabaseRestoreParams, id: string) {
		const { DB } = await import("@/modules/api/DB");
		const db = await DB.findOne("database", { _id: id });
		if (!db) throw new Error(`Cloud database not found.`);
		return this.restore(options, db);
	}

	async restore(options: DatabaseRestoreParams, toDatabase: ICloudDatabase) {
		// validate destination
		if (!toDatabase.type) throw new Error(`Destination database type is required, should be one of: ${cloudDatabaseList.join(",")}.`);
		if (toDatabase.type !== "mongodb" && toDatabase.type !== "mariadb" && toDatabase.type !== "mysql" && toDatabase.type !== "postgresql")
			throw new Error(`Destination database type "${toDatabase.type}" is not supported at the moment.`);
		if (!toDatabase.host) throw new Error(`Destination database host is required.`);
		if (!toDatabase.pass) throw new Error(`Destination password is required.`);

		// validate backup
		if (!options.path) throw new Error(`Backup path is required.`);

		// backup
		let res: { name: string; path: string };
		switch (toDatabase.type) {
			case "mariadb":
			case "mysql":
				res = await MySQL.backup({
					dbName: options.dbName,
					host: toDatabase.host,
					port: toString(toDatabase.port),
					user: toDatabase.user,
					pass: toDatabase.pass,
				});
				break;
			case "mongodb":
				res = await MongoShell.backup({
					dbName: options.dbName,
					url: toDatabase.url,
					host: toDatabase.host,
					port: toString(toDatabase.port),
					user: toDatabase.user,
					pass: toDatabase.pass,
				});
				break;
			case "postgresql":
				res = await PostgreSQL.backup({
					dbName: options.dbName,
					url: toDatabase.url,
					host: toDatabase.host,
					port: toString(toDatabase.port),
					user: toDatabase.user,
					pass: toDatabase.pass,
				});
				break;
			default:
				return respondFailure(`Database type "${toDatabase.type}" is not supported backing up at the moment.`);
		}

		return res;
	}

	async scheduleAutoBackup(
		id: string,
		repeat: CronjobRepeat,
		condition?: CronjonRepeatCondition,
		ownership?: { owner: string; workspace: string }
	) {
		const { DB } = await import("@/modules/api/DB");
		// validate
		if (typeof repeat?.range === "undefined") throw new Error(`Recurrent range is required.`);
		if (typeof repeat?.unit === "undefined") throw new Error(`Recurrent unit is required, one of: ${cronjobRepeatUnitList.join(", ")}.`);

		const db = await this.findOne({ _id: id });
		if (!db) throw new Error(`Database not found.`);

		const apiKey = await DB.findOne("api_key_user", { workspaces: db.workspace });

		// create new cronjob
		const request: CronjobRequest = {
			url: `${Config.BASE_URL}/api/v1/database/backup`,
			method: "POST",
			params: { id: MongoDB.toString(db._id) },
			headers: {
				"X-API-Key": apiKey.token.access_token,
			},
		};
		const cronjob = await createCronjobRepeat(`[SYSTEM] Backup database "${db.name}"`, request, repeat, condition, ownership);
		if (!cronjob) throw new Error(`Unable to schedule auto-backup for "${db.name}" database.`);

		// update cronjob ID to database:
		const updatedDb = await DB.updateOne(
			"database",
			{ _id: id },
			{ autoBackup: cronjob._id, owner: ownership?.owner, workspace: ownership?.workspace }
		);
		return updatedDb;
	}
}
