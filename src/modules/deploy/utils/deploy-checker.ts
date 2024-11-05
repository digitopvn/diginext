import ClusterManager from "@/modules/k8s";

export class DeploymentReadinessChecker {
	constructor(
		private readonly context: string,
		private readonly namespace: string,
		private readonly appName: string,
		private readonly appVersion: string,
		private readonly onUpdate?: (msg: string) => void
	) {}

	async checkPodHealth(pods: any[]) {
		const crashedPods = pods.filter((pod) => pod.status.containerStatuses.some((status) => status.state.waiting?.reason === "CrashLoopBackOff"));

		return {
			totalPods: pods.length,
			crashedPods: crashedPods.length,
			isHealthy: crashedPods.length === 0,
		};
	}

	async getPods() {
		return ClusterManager.getPods(this.namespace, {
			context: this.context,
			filterLabel: `app-version=${this.appVersion}`,
			metrics: false,
		});
	}

	async isDeploymentReady(requiredReplicas: number): Promise<boolean> {
		const pods = await this.getPods();
		if (!pods.length) {
			this.onUpdate?.(`No pods found for ${this.appName}`);
			return false;
		}

		const health = await this.checkPodHealth(pods);
		if (!health.isHealthy) {
			this.onUpdate?.(`Found ${health.crashedPods} crashed pods out of ${health.totalPods}`);
			return false;
		}

		const readyPods = pods.filter((pod) => pod.status?.conditions?.some((c) => c.type === "Ready" && c.status === "True"));

		return readyPods.length >= requiredReplicas;
	}
}
