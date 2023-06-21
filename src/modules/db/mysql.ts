import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
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

export const checkConnection = async (options: MysqlConnectionInfo & { isDebugging?: boolean }) => {
	const { execa, execaCommand, execaSync } = await import("execa");

	try {
		const { stdout, stderr } = execaSync(`mysql`, [
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

export const backup = async (
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
	const { execa, execaCommand, execaSync } = await import("execa");

	const bkName = `mysql-backup-${makeDaySlug()}.sql`;
	if (!options.outDir) options.outDir = path.resolve(CLI_DIR, `storage/mysql`);
	if (!existsSync(options.outDir)) mkdirSync(options.outDir, { recursive: true });

	const outPath = path.resolve(options.outDir, bkName);

	const { stdout, stderr } = execaSync(`mysqldump`, [
		"-h",
		options.host,
		"-P",
		(options.port || 3306).toString(),
		"-u",
		options.user || "root",
		`-p${options.pass}`,
		options.dbName ? options.dbName : "--all-databases",
		"--no-create-db",
		"--lock-tables=false",
		"--column-statistics=false",
		"--result-file",
		outPath,
	]);
	if (options.isDebugging) console.log("[MYSQL] Backup successfully :>> ", stdout);
	return { name: bkName, path: outPath };
};

export const restore = async (
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
	const { execa, execaCommand, execaSync } = await import("execa");

	if (!options.path) throw new Error(`Input "dir" path to ".dump" file is required.`);
	if (!options.dbName) throw new Error(`Database name "dbName" is required.`);

	try {
		if (!options.path.endsWith(".sql")) throw new Error(`Invalid backup path, must end with ".sql"`);
		const { stdout, stderr } = execaSync(`mysql`, [
			"-h",
			options.host,
			"-P",
			(options.port || 3306).toString(),
			"-u",
			options.user || "root",
			`-p${options.pass}`,
			`-D${options.dbName}`,
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
