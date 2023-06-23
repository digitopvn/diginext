import { logError, logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";
import yargs from "yargs";

import type { ICloudDatabase } from "@/entities";

import type { InputOptions } from "../../interfaces/InputOptions";
import { askForDatabase } from "./ask-databases";
import MongoShell from "./mongo";
import MySQL from "./mysql";
import PostgreSQL from "./pg";

/**
 *
 * @param {InputOptions} options
 * @param {InputOptions.env} env
 * @returns {InputOptions}
 */
export async function execDatabase(options: InputOptions, env) {
	const { secondAction, targetDirectory } = options;

	let db: ICloudDatabase;

	switch (secondAction) {
		case "healthz":
			let isHealthy: boolean = false;
			db = await askForDatabase();
			switch (db.type) {
				case "mariadb":
				case "mysql":
					isHealthy = await MySQL.checkConnection({ host: db.host, port: db.port?.toString(), user: db.user, pass: db.pass });
					if (isHealthy) {
						logSuccess(`Database "${db.name}" is healthy.`);
					} else {
						logError(`Unable to connect database "${db.name}".`);
					}
					break;
				case "mongodb":
					isHealthy = await MongoShell.checkConnection({
						url: db.url,
						host: db.host,
						port: db.port?.toString(),
						user: db.user,
						pass: db.pass,
					});
					if (isHealthy) {
						logSuccess(`Database "${db.name}" is healthy.`);
					} else {
						logError(`Unable to connect database "${db.name}".`);
					}
					break;
				case "postgresql":
					isHealthy = await PostgreSQL.checkConnection({ host: db.host, port: db.port?.toString(), user: db.user, pass: db.pass });
					if (isHealthy) {
						logSuccess(`Database "${db.name}" is healthy.`);
					} else {
						logError(`Unable to connect database "${db.name}".`);
					}
					break;
				default:
					logWarn(`Database type "${db.type}" is not supported at the moment.`);
					break;
			}
			break;

		case "backup":
			db = await askForDatabase();
			switch (db.type) {
				case "mariadb":
				case "mysql":
					try {
						await MySQL.backup({
							dbName: options.name,
							outDir: options.targetDirectory,
							host: db.host,
							port: db.port?.toString(),
							user: db.user,
							pass: db.pass,
						});
					} catch (e) {
						logError(e.toString());
					}
					break;
				case "mongodb":
					try {
						await MongoShell.backup({
							dbName: options.name,
							outDir: options.targetDirectory,
							url: db.url, // <-- only mongodb
							host: db.host,
							port: db.port?.toString(),
							user: db.user,
							pass: db.pass,
						});
					} catch (e) {
						logError(e.toString());
					}
					break;
				case "postgresql":
					try {
						await PostgreSQL.backup({
							dbName: options.name,
							outDir: options.targetDirectory,
							host: db.host,
							port: db.port?.toString(),
							user: db.user,
							pass: db.pass,
						});
					} catch (e) {
						logError(e.toString());
					}
					break;
				default:
					logWarn(`Database type "${db.type}" is not supported at the moment.`);
					break;
			}
			break;

		case "restore":
			// db = await askForDatabase();
			switch (db.type) {
				case "mariadb":
				case "mysql":
					// ...
					logWarn(`This feature is under development.`);
					break;
				case "mongodb":
					// ...
					logWarn(`This feature is under development.`);
					break;
				case "postgresql":
					// ...
					logWarn(`This feature is under development.`);
					break;
				default:
					logWarn(`Database type "${db.type}" is not supported at the moment.`);
					break;
			}
			break;

		default:
			yargs.showHelp();
	}
}
