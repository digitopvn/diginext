import "reflect-metadata";

import { logError, logSuccess } from "diginext-utils/dist/console/log";

import App from "@/entities/App";
// entities
import Build from "@/entities/Build";
import CloudDatabase from "@/entities/CloudDatabase";
import CloudProvider from "@/entities/CloudProvider";
import Cluster from "@/entities/Cluster";
import ContainerRegistry from "@/entities/ContainerRegistry";
import Framework from "@/entities/Framework";
import GitProvider from "@/entities/GitProvider";
import Project from "@/entities/Project";
import Release from "@/entities/Release";
import Role from "@/entities/Role";
import Team from "@/entities/Team";
import User from "@/entities/User";
import Workspace from "@/entities/Workspace";
import type { EntityTarget, ObjectLiteral } from "@/libs/typeorm";
import { DataSource } from "@/libs/typeorm";

export const appDataSource = new DataSource({
	type: "mongodb",
	url: process.env.MONGODB_CONNECTION_STRING,
	useNewUrlParser: true,
	useUnifiedTopology: true,
	synchronize: false,
	logging: true,
	entities: [
		App,
		User,
		Role,
		Team,
		Workspace,
		Project,
		Release,
		Build,
		CloudProvider,
		GitProvider,
		Cluster,
		CloudDatabase,
		ContainerRegistry,
		Framework,
	],
	// database: "digirelease",
	// subscribers: [],
	// migrations: [],
});

export const manager = appDataSource.manager;

export async function connect(onConnected?: any) {
	try {
		const dataSource = await appDataSource.initialize();
		if (process.env.CLI_MODE == "server") logSuccess("[DATABASE] MongoDB is connected!");
		if (typeof onConnected != "undefined") onConnected(dataSource);
	} catch (e) {
		logError(e);
	}
}

export function query(entity: EntityTarget<ObjectLiteral>) {
	return appDataSource ? appDataSource.getMongoRepository(entity) : null;
}

export function metadata(entity: EntityTarget<ObjectLiteral>) {
	return appDataSource ? appDataSource.getMetadata(entity) : null;
}

const AppDatabase = { appDataSource, manager, connect, query, metadata };

export default AppDatabase;
