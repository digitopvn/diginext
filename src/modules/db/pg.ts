import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import execa from "execa";
import { existsSync, mkdirSync } from "fs";
import path from "path";

import { CLI_DIR } from "@/config/const";

export type PostgresConnectionInfo = {
	/**
	 * Auth database name
	 * @default admin
	 */
	auth?: string;
	host: string;
	/**
	 * @default 5432
	 */
	port?: string;
	/**
	 * @default root
	 */
	user?: string;
	pass: string;
};

export const checkConnection = (options: PostgresConnectionInfo & { isDebugging?: boolean }) => {
	console.log("checkConnection > options :>> ", options);
	try {
		const { stdout, stderr } = execa.sync(`psql`, [
			`postgresql://${options.user}:${options.pass}@${options.host}:${options.port}/${options.auth || "admin"}`,
			"-c",
			"SELECT version();",
		]);
		if (options.isDebugging) console.log("[POSTGRES] Connected :>> ", stdout);
		return true;
	} catch (e) {
		console.error("[POSTGRES]", e);
		return false;
	}
};

export const backup = (
	options: Partial<PostgresConnectionInfo> & {
		/**
		 * @default all-databases
		 */
		dbName?: string;
		/**
		 * @default admin
		 */
		authDb?: string;
		/**
		 * Output directory
		 */
		outDir?: string;
	} & { isDebugging?: boolean }
) => {
	const bkName = `mysql-backup-${makeDaySlug()}.sql`;
	if (!options.outDir) options.outDir = path.resolve(CLI_DIR, `storage/mysql`);

	if (!existsSync(options.outDir)) mkdirSync(options.outDir, { recursive: true });

	const outPath = path.resolve(options.outDir, bkName);

	if (options.dbName) {
		const { stdout, stderr } = execa.sync(`pg_dump`, [
			"-h",
			options.host,
			"-p",
			(options.port || 5432).toString(),
			"-U",
			options.user || "root",
			"-W",
			options.pass,
			"-d",
			options.dbName,
			"-F",
			"c",
			"-f",
			outPath,
		]);
		if (options.isDebugging) console.log(`[POSTGRES] Backup database "${options.dbName}" successfully :>> `, stdout);
	} else {
		const { stdout, stderr } = execa.sync(`pg_dumpall`, [
			"-h",
			options.host,
			"-p",
			(options.port || 5432).toString(),
			"-U",
			options.user || "root",
			"-W",
			options.pass,
			"-d",
			options.dbName,
			"-f",
			outPath,
		]);
		if (options.isDebugging) console.log("[POSTGRES] Backup all databases successfully :>> ", stdout);
	}
	return { name: bkName, path: outPath };
};

export const restore = (
	options: Partial<PostgresConnectionInfo> & {
		/**
		 * Database name
		 * @default "all-databases"
		 */
		dbName?: string;
		/**
		 * @default admin
		 */
		authDb?: string;
		/**
		 * Path to backup ".dump"
		 */
		path?: string;
	} & { isDebugging?: boolean }
) => {
	if (!options.path) throw new Error(`Input "dir" path to ".dump" file is required.`);

	try {
		if (!options.path.endsWith(".sql")) throw new Error(`Invalid backup path, must end with ".sql"`);
		if (!options.dbName) {
			const { stdout, stderr } = execa.sync(`psql`, [
				"-h",
				options.host,
				"-p",
				(options.port || 5432).toString(),
				"-U",
				options.user || "root",
				"-W",
				options.pass,
				"-f",
				options.path,
			]);
			if (options.isDebugging) console.log("[POSTGRES] Restore all databases successfully :>> ", stdout);
		} else {
			const { stdout, stderr } = execa.sync(`pg_restore`, [
				"-h",
				options.host,
				"-p",
				(options.port || 5432).toString(),
				"-U",
				options.user || "root",
				"-W",
				options.pass,
				"-d",
				options.dbName,
				"-c",
				options.path,
			]);
			if (options.isDebugging) console.log(`[POSTGRES] Restore "${options.dbName}" database successfully :>> `, stdout);
		}
		return true;
	} catch (e) {
		return false;
	}
};

const PostgreSQL = { checkConnection, backup, restore };

export default PostgreSQL;
