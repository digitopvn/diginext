import { log, logSuccess } from "diginext-utils/dist/console/log";
import * as fs from "fs";
import { isEmpty } from "lodash";
import cronjob from "node-cron";

import { isDevMode, IsTest } from "@/app.config";
import { cleanUp } from "@/build/system";
import { CLI_CONFIG_DIR } from "@/config/const";
import type { IUser } from "@/entities";
import { migrateAllFrameworks } from "@/migration/migrate-all-frameworks";
import { migrateAllGitProviders } from "@/migration/migrate-all-git-providers";
import { migrateServiceAccountAndApiKey } from "@/migration/migrate-all-sa-and-api-key";
import { migrateAllAppEnvironment } from "@/migration/migrate-app-environment";
import { migrateDefaultServiceAccountAndApiKeyUser } from "@/migration/migrate-service-account";
import { generateSSH, sshKeysExisted, verifySSH } from "@/modules/git";
import ClusterManager from "@/modules/k8s";
import { connectRegistry } from "@/modules/registry/connect-registry";
import { execCmd, wait } from "@/plugins";
import { seedDefaultRoles } from "@/seeds";
import { seedSystemInitialData } from "@/seeds/seed-system";
import { setServerStatus } from "@/server";
import { ClusterService, ContainerRegistryService, GitProviderService, WorkspaceService } from "@/services";

/**
 * BUILD SERVER INITIAL START-UP SCRIPTS:
 * - Create config directory in {HOME_DIR}
 * - Connect GIT providers (if any)
 * - Connect Container Registries (if any)
 * - Connect K8S clusters (if any)
 * - Start system cronjobs
 * - Seed some initial data
 */
export async function startupScripts() {
	log(`-------------- Server is initializing -----------------`);

	// config dir
	if (!fs.existsSync(CLI_CONFIG_DIR)) fs.mkdirSync(CLI_CONFIG_DIR);

	// connect git providers
	const isSSHKeysExisted = await sshKeysExisted();
	if (!isSSHKeysExisted) await generateSSH();

	// console.log("gitProviders :>> ");
	// console.dir(gitProviders, { depth: 10 });

	/**
	 * No need to verify SSH for "test" environment?
	 */
	if (!IsTest()) {
		const gitSvc = new GitProviderService();
		const gitProviders = await gitSvc.find({});
		if (!isEmpty(gitProviders)) {
			for (const gitProvider of gitProviders) verifySSH({ gitProvider: gitProvider.type });
		}
	}

	// set global identity
	if (!isDevMode) {
		// <-- to make sure it won't override your GIT config when developing Diginext
		execCmd(`git init`);
		execCmd(`git config --global user.email server@diginext.site`);
		execCmd(`git config --global --add user.name Diginext`);
	}

	// seed system initial data: Cloud Providers
	await seedSystemInitialData();

	// seed default roles to workspace if missing:
	const wsSvc = new WorkspaceService();
	let workspaces = await wsSvc.find({}, { populate: ["owner"] });

	if (workspaces.length > 0) {
		await Promise.all(workspaces.map((ws) => seedDefaultRoles(ws, ws.owner as IUser)));
	}

	// connect container registries
	const registrySvc = new ContainerRegistryService();
	const registries = await registrySvc.find({});
	if (registries.length > 0) {
		for (const registry of registries) {
			connectRegistry(registry).catch((e) => {
				// wait for 2 minutes and retry
				wait(2 * 60 * 2000, connectRegistry(registry));
			});
		}
	}

	// connect clusters
	const clusterSvc = new ClusterService();
	const clusters = await clusterSvc.find({});
	if (clusters.length > 0) {
		for (const cluster of clusters) {
			await ClusterManager.authCluster(cluster.shortName, { shouldSwitchContextToThisCluster: false });
		}
	}

	/**
	 * CRONJOBS
	 * ---
	 * Schedule a clean up task every 7 days at 02:00 AM
	 * (Skip for test environment)
	 */
	if (!IsTest()) {
		const repeatDays = 7; // every 7 days
		const atHour = 2; // 2AM
		logSuccess(`[SYSTEM] ✓ Cronjob of "System Clean Up" has been scheduled every ${repeatDays} days at ${atHour}:00 AM`);
		cronjob.schedule(`0 ${atHour} */${repeatDays} * *`, () => cleanUp());
	}

	/**
	 * Database migration
	 */
	await migrateAllAppEnvironment();
	await migrateAllFrameworks();
	await migrateAllGitProviders();
	await migrateServiceAccountAndApiKey();
	await migrateDefaultServiceAccountAndApiKeyUser();

	/**
	 * Mark "healthz" return true & server is ready to receive connections:
	 */
	setServerStatus(true);
}
