import * as fs from "fs";
import { isEmpty } from "lodash";
import cronjob from "node-cron";

import { isDevMode, IsTest } from "@/app.config";
import { cleanUp } from "@/build/system";
import { CLI_CONFIG_DIR } from "@/config/const";
import type { IUser } from "@/entities";
import { migrateAllFrameworks } from "@/migration/migrate-all-frameworks";
import { migrateAllGitProviders } from "@/migration/migrate-all-git-providers";
import { migrateAllRecords } from "@/migration/migrate-all-records";
import { migrateAllRoles } from "@/migration/migrate-all-roles";
import { migrateServiceAccountAndApiKey } from "@/migration/migrate-all-sa-and-api-key";
import { migrateAllUsers } from "@/migration/migrate-all-users";
import { migrateAllAppEnvironment } from "@/migration/migrate-app-environment";
import { migrateDefaultServiceAccountAndApiKeyUser } from "@/migration/migrate-service-account";
import { generateSSH, sshKeyContainPassphase, sshKeysExisted, verifySSH } from "@/modules/git";
import ClusterManager from "@/modules/k8s";
import { connectRegistry } from "@/modules/registry/connect-registry";
import { execCmd, wait } from "@/plugins";
import { seedDefaultRoles } from "@/seeds";
import { seedDefaultProjects } from "@/seeds/seed-projects";
import { seedSystemInitialData } from "@/seeds/seed-system";
import { setServerStatus } from "@/server";
import { ClusterService, ContainerRegistryService, GitProviderService, WorkspaceService } from "@/services";

import { findAndRunCronjob } from "../cronjob/find-and-run-job";

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
	console.log(`[DIGINEXT] Server is initializing...`);

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

	// Generate SSH keys
	const isSSHKeysExisted = await sshKeysExisted();
	if (!isSSHKeysExisted) await generateSSH();
	// verify if generated SSH key should not require passphase
	const keyHasPassphase = sshKeyContainPassphase();
	if (keyHasPassphase) console.warn(`SSH key "id_rsa" should not contain passphase.`);

	/**
	 * Connect to git providers
	 * (No need to verify SSH for "test" environment)
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

	const wsSvc = new WorkspaceService();
	let workspaces = await wsSvc.find({}, { populate: ["owner"] });

	if (workspaces.length > 0) {
		// seed default roles to workspace if missing:
		await Promise.all(workspaces.map((ws) => seedDefaultRoles(ws, ws.owner as IUser)));
		// seed default projects to workspace if missing:
		await Promise.all(workspaces.map((ws) => seedDefaultProjects(ws, ws.owner as IUser)));
	}

	// connect container registries
	const registrySvc = new ContainerRegistryService();
	const registries = await registrySvc.find({});
	if (registries.length > 0) {
		for (const registry of registries) {
			connectRegistry(registry, { workspaceId: registry.workspace }).catch((e) => {
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
			await ClusterManager.authCluster(cluster, { shouldSwitchContextToThisCluster: false });
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
		console.log(`[SYSTEM] ✓ Cronjob of "System Clean Up" has been scheduled every ${repeatDays} days at ${atHour}:00 AM`);
		cronjob.schedule(`0 ${atHour} */${repeatDays} * *`, () => cleanUp());
	}

	/**
	 * Database migration
	 */
	await migrateAllRecords();
	await migrateAllRoles();
	await migrateAllUsers();
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
