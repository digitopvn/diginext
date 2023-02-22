import { logError, logSuccess } from "diginext-utils/dist/console/log";
import generator from "generate-password";
import { MongoClient } from "mongodb";

let currentDB;

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
