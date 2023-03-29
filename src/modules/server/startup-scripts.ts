import { log, logSuccess } from "diginext-utils/dist/console/log";
import * as fs from "fs";
import { isEmpty } from "lodash";
import cronjob from "node-cron";

import { cleanUp } from "@/build/system";
import { CLI_CONFIG_DIR } from "@/config/const";
import { migrateAllFrameworks } from "@/migration/migrate-all-frameworks";
import { migrateAllGitProviders } from "@/migration/migrate-all-git-providers";
import { migrateAllReleases } from "@/migration/migrate-all-releases";
import { migrateAllRoles } from "@/migration/migrate-all-roles";
import { migrateAllAppEnvironment } from "@/migration/migrate-app-environment";
import { migrateDefaultServiceAccountAndApiKeyUser } from "@/migration/migrate-service-account";
import { generateSSH, sshKeysExisted, verifySSH } from "@/modules/git";
import ClusterManager from "@/modules/k8s";
import { connectRegistry } from "@/modules/registry/connect-registry";
import { execCmd } from "@/plugins";
import { seedSystemInitialData } from "@/seeds/seed-system";
import { ClusterService, ContainerRegistryService, GitProviderService } from "@/services";

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
	execCmd(`git config --global user.email "server@diginext.site"`);
	execCmd(`git config --global user.name "Diginext Server"`);

	// seed system initial data
	await seedSystemInitialData();

	// connect cloud providers
	// const providerSvc = new CloudProviderService();
	// const providers = await providerSvc.find({});
	// if (providers.length > 0) {
	// 	for (const provider of providers) {
	// 		providerAuthenticate(provider);
	// 	}
	// }

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
	await migrateAllReleases();
	await migrateAllFrameworks();
	await migrateAllGitProviders();

	// await migrateAllUserTypes();
	// await wait(5000);

	await migrateDefaultServiceAccountAndApiKeyUser();
	await migrateAllRoles();
}
