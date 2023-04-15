import "reflect-metadata";

import { logError, logSuccess } from "diginext-utils/dist/console/log";
import mongoose from "mongoose";

// entities

// export const appDataSource = new DataSource({
// 	type: "mongodb",
// 	url: process.env.MONGODB_CONNECTION_STRING,
// 	useNewUrlParser: true,
// 	useUnifiedTopology: true,
// 	synchronize: IsTest(), // only enable "synchronize" on "test" environment
// 	logging: true,
// 	entities: [
// 		App,
// 		Activity,
// 		User,
// 		ServiceAccount,
// 		ApiKeyAccount,
// 		Role,
// 		Route,
// 		Team,
// 		Workspace,
// 		Project,
// 		Release,
// 		Build,
// 		CloudProvider,
// 		GitProvider,
// 		Cluster,
// 		CloudDatabase,
// 		ContainerRegistry,
// 		Framework,
// 	],
// 	// database: "diginext",
// 	// subscribers: [],
// 	// migrations: [],
// });

// export const manager = appDataSource.manager;

export async function connect(onConnected?: (db: typeof mongoose) => void) {
	try {
		const db = await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});

		// const dataSource = await appDataSource.initialize();
		if (process.env.CLI_MODE == "server") logSuccess("[DATABASE] MongoDB is connected!");
		if (typeof onConnected != "undefined") onConnected(db);
	} catch (e) {
		logError(e);
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
