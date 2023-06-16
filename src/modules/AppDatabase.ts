import "reflect-metadata";

import { logError, logSuccess } from "diginext-utils/dist/xconsole/log";
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
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});

		db = mongoDB;

		// const dataSource = await appDataSource.initialize();
		if (process.env.CLI_MODE == "server") logSuccess("[DATABASE] MongoDB is connected!");
		if (typeof onConnected != "undefined") onConnected(db, mongoDB.connection);

		return db;
	} catch (e) {
		console.error(e);
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
