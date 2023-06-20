import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import execa from "execa";
import { existsSync, mkdirSync } from "fs";
import path from "path";

import { CLI_DIR } from "@/config/const";

export type MysqlConnectionInfo = {
	host: string;
	/**
	 * @default 3306
	 */
	port?: string;
	/**
	 * @default root
	 */
	user?: string;
	pass: string;
};

export const checkConnection = (options: MysqlConnectionInfo & { isDebugging?: boolean }) => {
	try {
		const { stdout, stderr } = execa.sync(`mysql`, [
			"-h",
			options.host,
			"-P",
			(options.port || 3306).toString(),
			"-u",
			options.user || "root",
			`-p${options.pass}`,
			"-e",
			"SELECT version();",
		]);
		if (options.isDebugging) console.log("[MYSQL] Connected :>> ", stdout);
		return true;
	} catch (e) {
		console.error("[MYSQL]", e);
		return false;
	}
};

export const backup = (
	options: Partial<MysqlConnectionInfo> & {
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

	const { stdout, stderr } = execa.sync(`mysqldump`, [
		"-h",
		options.host,
		"-P",
		(options.port || 3306).toString(),
		"-u",
		options.user || "root",
		`-p${options.pass}`,
		options.dbName ? `--db=${options.dbName}` : "--all-databases",
		">",
		outPath,
	]);
	if (options.isDebugging) console.log("[MYSQL] Backup successfully :>> ", stdout);
	return { name: bkName, path: outPath };
};

export const restore = (
	options: Partial<MysqlConnectionInfo> & {
		/**
		 * Database name
		 */
		dbName: string;
		/**
		 * @default admin
		 */
		authDb?: string;
		/**
		 * Backup path
		 */
		path?: string;
	} & { isDebugging?: boolean }
) => {
	if (!options.path) throw new Error(`Input "dir" path to ".dump" file is required.`);
	if (!options.dbName) throw new Error(`Database name "dbName" is required.`);

	try {
		if (!options.path.endsWith(".sql")) throw new Error(`Invalid backup path, must end with ".sql"`);
		const { stdout, stderr } = execa.sync(`mysql`, [
			"-h",
			options.host,
			"-P",
			(options.port || 3306).toString(),
			"-u",
			options.user || "root",
			`-p${options.pass}`,
			options.dbName,
			"<",
			options.path,
		]);
		if (options.isDebugging) console.log(`[MYSQL] Restore "${options.dbName}" database successfully :>> `, stdout);
		return true;
	} catch (e) {
		return false;
	}
};

const MySQL = { checkConnection, backup, restore };

export default MySQL;
