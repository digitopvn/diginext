import "reflect-metadata";

import { logError, logSuccess } from "diginext-utils/dist/console/log";
import mongoose from "mongoose";

import { Config } from "@/app.config";

const dbName = Config.DB_NAME;

export async function connect(onConnected?: (db?: typeof mongoose) => void) {
	console.log("Config.DB_URI :>> ", Config.DB_URI);
	console.log("Config.DB_NAME :>> ", Config.DB_NAME);
	try {
		const db = await mongoose.connect(Config.DB_URI, {
			dbName,
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});

		// const dataSource = await appDataSource.initialize();
		if (process.env.CLI_MODE == "server") logSuccess("[DATABASE] MongoDB is connected!");
		if (typeof onConnected != "undefined") onConnected();
	} catch (e) {
		console.error(e);
		process.exit(1); // passing 1 - will exit the proccess with error
	}
}

export async function disconnect() {
	try {
		await mongoose.disconnect();
	} catch (e) {
		logError(e);
	}
}

// export function query(entity: EntityTarget<ObjectLiteral>) {
// 	return appDataSource ? appDataSource.getMongoRepository(entity) : null;
// }

// export function metadata(entity: EntityTarget<ObjectLiteral>) {
// 	return appDataSource ? appDataSource.getMetadata(entity) : null;
// }

const AppDatabase = { connect, disconnect };

export default AppDatabase;
