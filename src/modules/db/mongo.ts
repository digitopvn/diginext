import { makeDaySlug } from "diginext-utils/dist/string/makeDaySlug";
import { logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import execa from "execa";
import { existsSync, mkdirSync } from "fs";
import generator from "generate-password";
import { MongoClient } from "mongodb";
import path from "path";

import { CLI_DIR } from "@/config/const";

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

export const checkConnection = (options: Partial<MongoConnectionInfo> & { isDebugging?: boolean }) => {
	try {
		if (options.url) {
			const { stdout, stderr } = execa.sync(`mongo`, [options.url, "--eval", "db.version()"]);
			if (options.isDebugging) console.log("[MONGODB] Connected :>> ", stdout);
		} else {
			const { stdout, stderr } = execa.sync(`mongo`, [
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

export const backup = (
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
	const bkName = `mongodb-backup-${makeDaySlug()}`;
	if (!options.outDir) options.outDir = path.resolve(CLI_DIR, `storage/mongodb/${bkName}`);

	if (!existsSync(options.outDir)) mkdirSync(options.outDir, { recursive: true });

	if (options.url) {
		const { stdout, stderr } = execa.sync(`mongodump`, ["--uri", options.url, "--out", options.outDir]);
		if (options.isDebugging) console.log("[MONGODB] Backup successfully :>> ", stdout);
	} else {
		const { stdout, stderr } = execa.sync(`mongodump`, [
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
		if (options.isDebugging) console.log("[MONGODB] Backup successfully :>> ", stdout);
	}
	return { name: bkName, path: options.outDir };
};

export const restore = (
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
	if (!options.dir) {
		options.dir = path.resolve(CLI_DIR, `storage/mongodb/mongodb-backup-${makeDaySlug()}`);
	}

	if (!existsSync(options.dir)) mkdirSync(options.dir, { recursive: true });

	try {
		if (options.url) {
			const { stdout, stderr } = execa.sync(`mongorestore`, ["--uri", options.url, options.dbName ? `--db=${options.dbName}` : ""]);
			if (options.isDebugging) console.log("[MONGODB] Restore successfully :>> ", stdout);
		} else {
			const { stdout, stderr } = execa.sync(`mongorestore`, [
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
