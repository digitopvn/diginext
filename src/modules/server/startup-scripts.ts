import { log, logSuccess } from "diginext-utils/dist/console/log";
import * as fs from "fs";
import { isEmpty } from "lodash";
import cronjob from "node-cron";

import { isDevMode } from "@/app.config";
import { cleanUp } from "@/build/system";
import { CLI_CONFIG_DIR } from "@/config/const";
import type { User } from "@/entities";
import { migrateAllFrameworks } from "@/migration/migrate-all-frameworks";
import { migrateAllGitProviders } from "@/migration/migrate-all-git-providers";
import { migrateServiceAccountAndApiKey } from "@/migration/migrate-all-sa-and-api-key";
import { migrateAllAppEnvironment } from "@/migration/migrate-app-environment";
import { migrateDefaultServiceAccountAndApiKeyUser } from "@/migration/migrate-service-account";
import { generateSSH, sshKeysExisted, verifySSH } from "@/modules/git";
import ClusterManager from "@/modules/k8s";
import { connectRegistry } from "@/modules/registry/connect-registry";
import { execCmd } from "@/plugins";
import { seedDefaultRoles } from "@/seeds";
import { seedSystemInitialData } from "@/seeds/seed-system";
import { ClusterService, ContainerRegistryService, GitProviderService, WorkspaceService } from "@/services";

/**
 * BUILD SERVER INITIAL START-UP SCRIPTS:
 * - Create config directory in {HOME_DIR}
 * - Connect GIT providers (if any)
 * - Connect Container Registries (if any)
 * - Connect K8S clusters (if any)
 * - Start cron jobs
 * - Seed some initial data
 */
export async function startupScripts() {
	log(`-------------- Server is initializing -----------------`);

	// config dir
	if (!fs.existsSync(CLI_CONFIG_DIR)) fs.mkdirSync(CLI_CONFIG_DIR);

	// connect git providers
	const isSSHKeysExisted = await sshKeysExisted();
	if (!isSSHKeysExisted) await generateSSH();

	const gitSvc = new GitProviderService();
	const gitProviders = await gitSvc.find({});
	if (!isEmpty(gitProviders)) {
		for (const gitProvider of gitProviders) verifySSH({ gitProvider: gitProvider.type });
	}

	// set global identity
	if (!isDevMode) {
		// <-- to make sure it won't override your GIT config when developing Diginext
		execCmd(`git config --global user.email "server@diginext.site"`);
		execCmd(`git config --global --add user.name "Diginext Server"`);
	}

	// seed system initial data: Cloud Providers
	await seedSystemInitialData();

	// seed default roles to workspace if missing:
	const wsSvc = new WorkspaceService();
	const workspaces = await wsSvc.find({}, { populate: ["owner"] });
	if (workspaces.length > 0) {
		await Promise.all(workspaces.map((ws) => seedDefaultRoles(ws, ws.owner as User)));
	}

	// connect container registries
	const registrySvc = new ContainerRegistryService();
	const registries = await registrySvc.find({});
	if (registries.length > 0) {
		for (const registry of registries) {
			connectRegistry(registry);
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

	// cronjobs
	logSuccess(`[SYSTEM] ✓ Cronjob of "System Clean Up" has been scheduled every 3 days at 00:00 AM`);
	/**
	 * Schedule a clean up task every 3 days at 00:00 AM
	 */
	cronjob.schedule("0 0 */3 * *", () => {
		cleanUp();
	});

	// migration

	await migrateAllAppEnvironment();
	// await migrateAllReleases();
	await migrateAllFrameworks();
	await migrateAllGitProviders();
	await migrateServiceAccountAndApiKey();
	await migrateDefaultServiceAccountAndApiKeyUser();
	// await migrateAllUsers();
	// await migrateUserWorkspaces();
}
