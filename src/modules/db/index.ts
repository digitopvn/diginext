import chalk from "chalk";
import { logError, logSuccess, logWarn } from "diginext-utils/dist/console/log";

import type { InputOptions } from "../../interfaces/InputOptions";
import { printHelp } from "../../plugins/utils";
import { signInBitbucket } from "../bitbucket";
import { bitbucketAuthentication } from "../bitbucket/promptForAuthOptions";
import { addDefaultUser, addUser, createNewDatabase } from "./mongo";

// TODO: Add/edit/delete cloud database

/**
 *
 * @param {InputOptions} options
 * @param {InputOptions.env} env
 * @returns {InputOptions}
 */
export async function execDatabase(options: InputOptions, env) {
	logWarn(`This feature is under development.`);
	return;

	options = await bitbucketAuthentication(options);
	await signInBitbucket(options);

	const { secondAction, thirdAction: dbName, fourAction, fifthAction } = options;

	switch (secondAction) {
		case "new":
			if (!dbName) logError(`Database name is required. Command: ${chalk.cyan("diginext db new <database_name>")}`);
			await createNewDatabase({ ...options, dbName });
			break;

		case "add-default-user":
			// ! WARNNING -> Security issue!
			// create default database user, with default username & password
			const result = await addDefaultUser({ ...options, dbName });
			logWarn(`Bạn chỉ xem được pass này một lần duy nhất, hãy lưu lại đi nhé!`);
			logWarn(`- Pass:`, chalk.yellow(result.pass));
			logSuccess(`Tạo default user cho database "${dbName}" tại [${env.toUpperCase()} / ${options.provider}] thành công.`);
			break;

		case "add-user":
			// create database user
			const name = fourAction;
			const pass = fifthAction;
			await addUser({ ...options, dbName, name, pass });
			logSuccess(`Tạo user "${name}" vào database "${dbName}" tại [${env.toUpperCase()} / ${options.provider}] thành công.`);
			break;

		default:
			printHelp();
			break;
	}

	return options;
}
