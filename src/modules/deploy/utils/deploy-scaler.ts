import ClusterManager from "@/modules/k8s";
import { waitUntil } from "@/plugins";

import { DeploymentReadinessChecker } from "./deploy-checker";

export class DeploymentScaler {
	constructor(
		private readonly context: string,
		private readonly namespace: string,
		private readonly onUpdate?: (msg: string) => void
	) {}

	async scaleDeployment(
		deploymentName: string,
		targetReplicas: number,
		timeout = 300 // 5 minutes
	): Promise<boolean> {
		try {
			this.onUpdate?.(`Scaling "${deploymentName}" to ${targetReplicas} replicas`);

			await ClusterManager.scaleDeploy(deploymentName, targetReplicas, this.namespace, { context: this.context });

			const checker = new DeploymentReadinessChecker(
				this.context,
				this.namespace,
				deploymentName,
				"", // No specific version for scaling existing deployment
				this.onUpdate
			);

			return await waitUntil(
				() => checker.isDeploymentReady(targetReplicas),
				5, // 5 second intervals
				timeout
			);
		} catch (error) {
			this.onUpdate?.(`Failed to scale deployment: ${error.message}`);
			return false;
		}
	}
}
