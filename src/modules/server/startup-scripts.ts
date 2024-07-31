import chalk from "chalk";
import * as fs from "fs";
import cronjob from "node-cron";

import { isDevMode, IsTest } from "@/app.config";
import { CLI_CONFIG_DIR } from "@/config/const";
import type { IUser } from "@/entities";
import { execCmd } from "@/plugins";
import { seedDefaultRoles } from "@/seeds";
import { seedDefaultProjects } from "@/seeds/seed-projects";
import { seedSystemInitialData } from "@/seeds/seed-system";
import { setServerStatus } from "@/server";
import { WorkspaceService } from "@/services";

import { findAndRunCronjob } from "../cronjob/find-and-run-job";
import { markLongRunningBuildAndReleaseAsFailed } from "../deploy/mark-long-build-release-as-failed";

/**
 * NOTE: BUILD SERVER INITIAL START-UP SCRIPTS:
 * - Create config directory in {HOME_DIR}
 * - Connect GIT providers (if any)
 * - Connect Container Registries (if any)
 * - Connect K8S clusters (if any)
 * - Start system cronjobs
 * - Seed some initial data
 */
export async function startupScripts() {
	console.log(`---------------------------------`);
	console.log(chalk.green(`[SYSTEM]`), `Server is initializing...`);

	// config dir
	if (!fs.existsSync(CLI_CONFIG_DIR)) fs.mkdirSync(CLI_CONFIG_DIR);

	/**
	 * System cronjob checking every minute...
	 * [Skip for unit tests]
	 */
	if (!IsTest()) {
		findAndRunCronjob();
		setInterval(findAndRunCronjob, 15 * 1000);
	}

	// NOTE: [isDevMode == process.env.DEV_MODE == true] to make sure it won't override your current GIT config when developing Diginext
	if (!isDevMode) {
		// write initial private SSH keys if any
		const result = await execCmd(`./scripts/custom_rsa.sh`);
		console.log(result);

		/**
		 * CAUTION: DO NOT TURN OFF THIS
		 * ---
		 * Set default git config
		 */
		execCmd(`git init`);
		execCmd(`git config --global user.email server@dxup.dev`);
		execCmd(`git config --global --add user.name Diginext`);
		execCmd(`git config --global http.postBuffer 524288000`); // 524 mb
	}

	// seed system initial data: Cloud Providers
	await seedSystemInitialData();

	const wsSvc = new WorkspaceService();
	let workspaces = await wsSvc.find({}, { populate: ["owner"] });

	if (workspaces.length > 0) {
		// seed default roles to workspace if missing:
		await Promise.all(workspaces.map((ws) => seedDefaultRoles(ws, ws.owner as IUser)));
		// seed default projects to workspace if missing:
		await Promise.all(workspaces.map((ws) => seedDefaultProjects(ws, ws.owner as IUser)));
	}

	// FIXME: Why would we need this?
	// connect container registries
	// const registrySvc = new ContainerRegistryService();
	// const registries = await registrySvc.find({});
	// if (registries.length > 0) {
	// 	for (const registry of registries) {
	// 		// console.log("registry.workspace :>> ", registry.workspace);
	// 		connectRegistry(registry, { workspaceId: registry.workspace }).catch((e) => {
	// 			// wait for 2 minutes and retry
	// 			wait(2 * 60 * 2000, connectRegistry(registry).catch(console.error));
	// 		});
	// 	}
	// }

	// connect clusters
	// const clusterSvc = new ClusterService();
	// const clusters = await clusterSvc.find({});
	// if (clusters.length > 0) {
	// 	for (const cluster of clusters) {
	// 		await ClusterManager.authCluster(cluster, { shouldSwitchContextToThisCluster: false, isDebugging: true });
	// 	}
	// }

	/**
	 * CRONJOBS
	 * ---
	 * Schedule a clean up task every 7 days at 02:00 AM
	 * (Skip for test environment)
	 */
	if (!IsTest()) {
		/**
		 * System clean up: DOCKER/PODMAN -> Not working (use server crontab currently instead)
		 */
		// const repeatDays = 7; // every 7 days
		// const atHour = 3; // 3AM
		// console.log(chalk.green(`[SYSTEM]`), `✓ Cronjob of "System Clean Up" has been scheduled every ${repeatDays} days at ${atHour}:00 AM`);
		// cronjob.schedule(`0 ${atHour} */${repeatDays} * *`, () => cleanUp());

		/**
		 * Mark all builds & releases with "in_progress" status longer than 1 hour as "failed".
		 * Run every hour.
		 */
		cronjob.schedule(`0 * * * *`, () => markLongRunningBuildAndReleaseAsFailed());
		markLongRunningBuildAndReleaseAsFailed();
	}

	/**
	 * Database migration
	 */
	// await migrateAllRecords();
	// await migrateAllRoles();
	// await migrateAllUsers();
	// await migrateAllAppEnvironment();
	// await migrateAllFrameworks();
	// await migrateAllGitProviders();
	// await migrateServiceAccountAndApiKey();
	// await migrateDefaultServiceAccountAndApiKeyUser();
	// await migrateAllClusters();

	/**
	 * Seed or update initial data
	 */
	// await seedInitialClusters();

	/**
	 * Mark "healthz" return true & server is ready to receive connections:
	 */
	setServerStatus(true);
}
