import { logWarn } from "diginext-utils/dist/xconsole/log";

import ClusterManager from "@/modules/k8s";

export class DeploymentCleaner {
	constructor(
		private readonly context: string,
		private readonly namespace: string,
		private readonly onUpdate?: (msg: string) => void
	) {}

	async cleanupOldDeployments(appName: string, currentVersion: string): Promise<void> {
		const cleanupTasks = [
			this.cleanupIngress(appName, currentVersion).catch((e) => {
				logWarn(`Cleanup task failed for "ingress" of "${appName}": ${e}`);
				this.onUpdate?.(`Cleanup task failed for "ingress" of "${appName}": ${e}`);
			}),
			this.cleanupServices(appName, currentVersion).catch((e) => {
				logWarn(`Cleanup task failed for "service" of "${appName}": ${e}`);
				this.onUpdate?.(`Cleanup task failed for "service" of "${appName}": ${e}`);
			}),
			this.cleanupDeployments(appName, currentVersion).catch((e) => {
				logWarn(`Cleanup task failed for "deployment" of "${appName}": ${e}`);
				this.onUpdate?.(`Cleanup task failed for "deployment" of "${appName}": ${e}`);
			}),
		];
		const cleanupTaskNames = ["ingress", "service", "deployment"];

		await Promise.allSettled(cleanupTasks)
			.then((results) => {
				results.forEach((result, index) => {
					if (result.status === "rejected") {
						logWarn(`Cleanup task failed for "${cleanupTaskNames[index]}" of "${appName}": ${result.reason}`);
						this.onUpdate?.(`Cleanup task failed for "${cleanupTaskNames[index]}" of "${appName}": ${result.reason}`);
					}
				});
			})
			.catch((e) => {
				logWarn(`Cleanup tasks failed for "${appName}": ${e}`);
				this.onUpdate?.(`Cleanup tasks failed for "${appName}": ${e}`);
			});
	}

	private async cleanupIngress(appName: string, currentVersion: string) {
		return ClusterManager.deleteIngressByFilter(this.namespace, {
			context: this.context,
			skipOnError: true,
			filterLabel: `main-app=${appName},app-version!=${currentVersion}`,
		});
	}

	private async cleanupServices(appName: string, currentVersion: string) {
		return ClusterManager.deleteServiceByFilter(this.namespace, {
			context: this.context,
			skipOnError: true,
			filterLabel: `main-app=${appName},app-version!=${currentVersion}`,
		});
	}

	private async cleanupDeployments(appName: string, currentVersion: string) {
		return ClusterManager.deleteDeploymentsByFilter(this.namespace, {
			context: this.context,
			skipOnError: true,
			filterLabel: `main-app=${appName},app-version!=${currentVersion}`,
		});
	}
}
