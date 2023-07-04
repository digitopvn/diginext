import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { existsSync, mkdirSync } from "fs";
import path from "path";

import { CLI_DIR } from "@/config/const";

export type PostgresConnectionInfo = {
	/**
	 * Connection string
	 */
	url?: string;
	/**
	 * Database name
	 * @default admin
	 */
	dbName?: string;
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

export const getConnectionString = (options: Partial<PostgresConnectionInfo>) => {
	if (options.url) return options.url;
	if (!options.host) throw new Error(`Param "host" is required.`);
	if (!options.pass) throw new Error(`Param "pass" is required.`);
	return `postgresql://${options.user || "root"}:${options.pass}@${options.host}:${options.port}/${options.dbName || ""}`;
};

export const checkConnection = async (options: PostgresConnectionInfo & { isDebugging?: boolean }) => {
	const { execa, execaCommand, execaSync } = await import("execa");

	if (options.isDebugging) console.log("[POSTGRES] checkConnection > options :>> ", options);
	try {
		const connectionStr = getConnectionString(options);
		const { stdout, stderr } = execaSync(`psql`, [connectionStr, "-c", "SELECT version();"]);
		if (options.isDebugging) console.log("[POSTGRES] Connected :>> ", stdout);
		return true;
	} catch (e) {
		console.error("[POSTGRES]", e);
		return false;
	}
};

export const backup = async (
	options: Partial<PostgresConnectionInfo> & {
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

	const bkName = `postgresql-backup-${makeDaySlug()}.${options.dbName ? "dump" : "sql"}`;
	if (!options.outDir) options.outDir = path.resolve(CLI_DIR, `storage/postgresql`);

	if (!existsSync(options.outDir)) mkdirSync(options.outDir, { recursive: true });

	const outPath = path.resolve(options.outDir, bkName);

	const connectionStr = getConnectionString(options);

	if (options.dbName) {
		const { stdout, stderr } = execaSync(`pg_dump`, [connectionStr, "-F", "c", "-f", outPath]);
		if (options.isDebugging) console.log(`[POSTGRES] Backup database "${options.dbName}" successfully :>> `, stdout);
	} else {
		const { stdout, stderr } = execaSync(`pg_dumpall`, ["-d", connectionStr, "-f", outPath], { env: { PGPASSWORD: options.pass } });
		if (options.isDebugging) console.log("[POSTGRES] Backup all databases successfully :>> ", stdout);
	}
	return { name: bkName, path: outPath };
};

export const restore = async (
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
	const { execa, execaCommand, execaSync } = await import("execa");

	if (!options.path) throw new Error(`Input "dir" path to ".dump" file is required.`);

	try {
		if (!options.path.endsWith(".sql")) throw new Error(`Invalid backup path, must end with ".sql"`);
		const connectionStr = getConnectionString(options);
		if (!options.dbName) {
			const { stdout, stderr } = execaSync(`psql`, [connectionStr, "-f", options.path]);
			if (options.isDebugging) console.log("[POSTGRES] Restore all databases successfully :>> ", stdout);
		} else {
			const { stdout, stderr } = execaSync(`pg_restore`, ["-d", connectionStr, "-c", options.path]);
			if (options.isDebugging) console.log(`[POSTGRES] Restore "${options.dbName}" database successfully :>> `, stdout);
		}
		return true;
	} catch (e) {
		return false;
	}
};

const PostgreSQL = { checkConnection, backup, restore };

export default PostgreSQL;
