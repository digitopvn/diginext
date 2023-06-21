import { log, logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import yargs from "yargs";

import { Config } from "@/app.config";
import { cliOpts } from "@/config/config";
import { CLI_DIR } from "@/config/const";
import type InputOptions from "@/interfaces/InputOptions";

export const checkPackageDependency = async (pkg: string, cmd: string) => {
	const { execa, execaCommand, execaSync } = await import("execa");
	try {
		const res = await execaCommand(pkg + " " + cmd, cliOpts);
		return res;
	} catch (e) {
		logError(`Package "${pkg}" is required to be installed.`);
		process.exit(1);
	}
};

export const startBuildServer = async () => {
	const { execa, execaCommand, execaSync } = await import("execa");

	// Check package dependencies: gcloud, kubectl, doctl, git, docker
	await checkPackageDependency("gcloud", "--version");
	await checkPackageDependency("kubectl", "config view");
	await checkPackageDependency("doctl", "version");
	await checkPackageDependency("git", "--version");
	await checkPackageDependency(Config.BUILDER, "--version");

	// switch working directory to CLI directory
	process.chdir(CLI_DIR);

	try {
		await execaCommand(`yarn start`);
		logSuccess(`Build server is up at: ${process.env.BASE_URL}`);
	} catch (e) {
		logError(e);
	}
};

export const stopBuildServer = async () => {
	const { execa, execaCommand, execaSync } = await import("execa");
	// switch working directory to CLI directory
	process.chdir(CLI_DIR);

	try {
		await execaCommand(`yarn stop`);
		logSuccess(`Build server has been stopped.`);
	} catch (e) {
		logError(e);
	}
};

export const restartBuildServer = async () => {
	const { execa, execaCommand, execaSync } = await import("execa");
	// switch working directory to CLI directory
	process.chdir(CLI_DIR);

	try {
		await execaCommand(`yarn stop`);
	} catch (e) {
		log(`Build server has not started yet.`);
		log(`Starting build server now...`);
	}
	try {
		await execaCommand(`yarn start`);
		return logSuccess(`Build server has been restarted.`);
	} catch (e) {
		return logError(e);
	}
};

export const execServer = async (options?: InputOptions) => {
	const { secondAction } = options;

	switch (secondAction) {
		case "up":
		case "start":
			return startBuildServer();

		case "down":
		case "stop":
			return stopBuildServer();

		case "restart":
			return restartBuildServer();

		default:
			yargs.showHelp();
			break;
	}
};
