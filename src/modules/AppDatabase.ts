import "reflect-metadata";

import { logError } from "diginext-utils/dist/xconsole/log";
import mongoose from "mongoose";

import { Config } from "@/app.config";

const dbName = Config.DB_NAME;
let db: typeof mongoose;

export async function connect(onConnected?: (_db?: typeof mongoose, connection?: mongoose.Connection) => void) {
	// console.log("Config.DB_URI :>> ", Config.DB_URI);
	// console.log("Config.DB_NAME :>> ", Config.DB_NAME);
	try {
		const mongoDB = await mongoose.connect(Config.DB_URI, {
			dbName,
			serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
			retryWrites: true,
			retryReads: true,
			connectTimeoutMS: 10000, // Give more time to connect
			socketTimeoutMS: 45000, // Socket timeout
			maxPoolSize: 10, // Limit connection pool size
			minPoolSize: 5, // Minimum connections to maintain
		});

		db = mongoDB;

		if (typeof onConnected != "undefined") onConnected(db, mongoDB.connection);

		return db;
	} catch (e) {
		console.error(e);
		// Retry connection after a delay
		setTimeout(() => connect(onConnected), 5000);
		process.exit(1); // passing 1 - will exit the proccess with error
	}
}

export async function disconnect() {
	try {
		await mongoose.disconnect();
		db = undefined;
	} catch (e) {
		logError(`[DB_DISCONNECT]`, e);
	}
}

const AppDatabase = { db, connect, disconnect };

export default AppDatabase;
