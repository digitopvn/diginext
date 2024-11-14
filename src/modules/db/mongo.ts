/* eslint-disable prettier/prettier */
import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import { existsSync, mkdirSync, rmSync } from "fs";
import generator from "generate-password";
import { MongoClient } from "mongodb";
import path from "path";

import { CLI_DIR, STORAGE_DIR } from "@/config/const";

let currentDB;

export type MongoConnectionInfo = {
	url?: string;
	host?: string;
	/**
	 * @default 27017
	 */
	port?: string;
	/**
	 * @default root
	 */
	user?: string;
	pass?: string;
};

// import { execaSync } from "execa";

export const checkConnection = async (options: Partial<MongoConnectionInfo> & { isDebugging?: boolean }) => {
	const { execa, execaCommand, execaSync } = await import("execa");
	try {
		if (options.url) {
			const { stdout, stderr } = execaSync(`mongosh`, [options.url, "--eval", "db.version()"]);
			if (options.isDebugging) console.log("[MONGODB] Connected :>> ", stdout);
		} else {
			const { stdout, stderr } = execaSync(`mongosh`, [
				"--host",
				`${options.host}:${options.port || 27017}`,
				"--username",
				options.user || "root",
				"--password",
				options.pass,
				"--eval",
				"db.version()",
			]);
			if (options.isDebugging) console.log("[MONGODB] Connected :>> ", stdout);
		}
		return true;
	} catch (e) {
		console.error("[MONGODB]", e);
		return false;
	}
};

export const backup = async (
	options: Partial<MongoConnectionInfo> & {
		/**
		 * @default all
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

	const bkName = `mongodb-backup-${makeDaySlug()}`;
	const mongoBackupDir = path.resolve(STORAGE_DIR, `mongodb`);
	if (!options.outDir) options.outDir = path.resolve(mongoBackupDir, bkName);

	if (!existsSync(options.outDir)) mkdirSync(options.outDir, { recursive: true });

	console.log("[MONGODB] backup > options :>> ", options);

	if (options.url) {
		const { stdout, stderr } = await execa(`mongodump`, ["--uri", options.url, "--out", options.outDir]);
		if (stderr) logError(stderr);
		if (options.isDebugging) console.log("[MONGODB] Backup successfully :>> ", stdout);
	} else {
		const { stdout, stderr } = await execa(`mongodump`, [
			"--host",
			`${options.host}:${options.port || 27017}`,
			"--username",
			options.user || "root",
			"--password",
			options.pass,
			"--authenticationDatabase",
			options.authDb || "admin",
			options.dbName ? `--db=${options.dbName}` : "",
			"--out",
			options.outDir,
		]);
		if (stderr) logError(stderr);
		if (options.isDebugging) console.log("[MONGODB] Backup successfully :>> ", stdout);
	}

	// compress backup folder
	const compressedBackupName = `${bkName}.tar.gz`;
	const { stdout } = await execa("tar", ["-czf", compressedBackupName, bkName], { cwd: mongoBackupDir });
	if (options.isDebugging) console.log("Compressing backup directory :>> ", stdout);

	// keep the compressed file, remove the directory to save disk space...
	const childBackupDir = path.join(mongoBackupDir, bkName);
	if (existsSync(childBackupDir)) rmSync(childBackupDir, { recursive: true, force: true });

	return { name: bkName, path: path.join(mongoBackupDir, compressedBackupName) };
};

export const restore = async (
	options: Partial<MongoConnectionInfo> & {
		/**
		 * Database name
		 * @default all-databases
		 */
		dbName?: string;
		/**
		 * @default admin
		 */
		authDb?: string;
		/**
		 * From a directory
		 */
		dir?: string;
	} & { isDebugging?: boolean }
) => {
	const { execa, execaCommand, execaSync } = await import("execa");

	if (!options.dir) {
		options.dir = path.resolve(CLI_DIR, `storage/mongodb/mongodb-backup-${makeDaySlug()}`);
	}

	if (!existsSync(options.dir)) mkdirSync(options.dir, { recursive: true });

	try {
		if (options.url) {
			const { stdout, stderr } = execaSync(`mongorestore`, ["--uri", options.url, options.dbName ? `--db=${options.dbName}` : ""]);
			if (options.isDebugging) console.log("[MONGODB] Restore successfully :>> ", stdout);
		} else {
			const { stdout, stderr } = execaSync(`mongorestore`, [
				"--host",
				`${options.host}:${options.port || 27017}`,
				"--username",
				options.user || "root",
				"--password",
				options.pass,
				"--authenticationDatabase",
				options.authDb || "admin",
				options.dbName ? `--db=${options.dbName}` : "",
				"--out",
				options.dir,
			]);
			if (options.isDebugging) console.log("[MONGODB] Restore successfully :>> ", stdout);
		}
		return true;
	} catch (e) {
		return false;
	}
};

export const connect = async ({ dbName, env = "dev", provider = "digitalocean" }) => {
	if (currentDB) return currentDB;

	if (!dbName) logError("Thiếu database name.");

	let client;

	const dbInfo = { auth: "", host: "" };
	// config[provider].database.mongo[env] || config[provider].database.mongo.default;

	let auth = dbInfo.auth;
	let host = dbInfo.host;
	let connectionStr = `mongodb://${auth}@${host}/${dbName}?authSource=admin`;

	try {
		client = await MongoClient.connect(connectionStr);
	} catch (err) {
		logError(err);
	}

	const db = client.db(dbName);
	currentDB = db;

	return db;
};

export const addUser = async ({ dbName, env = "dev", name, pass }) => {
	const db = await connect({ dbName, env });
	try {
		await db.addUser(name, pass, {
			roles: [
				{
					role: "dbOwner",
					db: dbName,
				},
			],
		});
	} catch (e) {
		logError(e);
	}
};

export const addDefaultUser = async ({ dbName, env = "dev" }) => {
	const pass =
		env == "dev"
			? "Top@123#"
			: generator.generate({
					length: 10,
					numbers: true,
			  });

	await addUser({ dbName, env, name: "admin", pass });

	return { dbName, env, name: "admin", pass };
};

export const createNewDatabase = async ({ env = "dev", dbName = "cli-test-1", provider = "digitalocean" }) => {
	const db = await connect({ dbName, env, provider });

	// create initial collection:
	try {
		await db.createCollection("logs");
	} catch (e) {
		if (e.codeName == "NamespaceExists") {
			logError(`Database '${dbName}' đã tồn tại, vui lòng chọn tên khác.`);
		}
	}

	// add users
	let host = ""; //TODO: find host
	// config.database.mongo[env].host;
	const { name, pass } = await addDefaultUser({ env, dbName });

	logSuccess(`Connection string:`, `mongodb://${name}:${encodeURIComponent(pass)}@${host}/${dbName}?authSource=${dbName}`);
	process.exit(1);
};

const MongoShell = { checkConnection, backup, restore };

export default MongoShell;
