import type { KubePod } from "@/interfaces/KubePod";
import ClusterManager from "@/modules/k8s";
import { waitUntil } from "@/plugins";

export class DeploymentReadinessChecker {
	constructor(
		private readonly context: string,
		private readonly namespace: string,
		private readonly appName: string,
		private readonly appVersion: string,
		private readonly onUpdate?: (msg: string) => void
	) {}

	async checkPodHealth(pods: KubePod[]) {
		const crashedPods = pods.filter(
			(pod) => pod.status?.containerStatuses?.some((status) => status.state.waiting?.reason === "CrashLoopBackOff")
		);
		const creatingPods = pods.filter(
			(pod) => pod.status?.containerStatuses?.some((status) => status.state.waiting?.reason === "ContainerCreating")
		);
		// const runningPods = pods.filter((pod) => pod.status?.phase === "Running");
		const runningPods = pods.filter((pod) => pod.status?.conditions?.some((c) => c.type === "Ready" && c.status === "True"));

		return {
			totalPods: pods.length,
			crashedPods: crashedPods.length,
			creatingPods: creatingPods.length,
			runningPods: runningPods.length,
			isHealthy: crashedPods.length === 0 && creatingPods.length === 0,
		};
	}

	async getPods() {
		const filterLabel = `main-app=${this.appName}${this.appVersion ? `,app-version=${this.appVersion}` : ""}`;
		return ClusterManager.getPods(this.namespace, {
			context: this.context,
			filterLabel,
			metrics: false,
		});
	}

	/**
	 * Wait until no creating pods every `interval` seconds (Max wait time is 5 minutes)
	 * @param interval - Interval time in seconds
	 * @param maxWaitTime - Max wait time in seconds
	 */
	async waitUntilNoCreatingPods(interval = 10, maxWaitTime = 5 * 60) {
		this.onUpdate?.(`Waiting until new pods of "${this.appName}" are finished creating...`);
		await waitUntil(
			async () => {
				const pods = await this.getPods();
				const health = await this.checkPodHealth(pods);
				this.onUpdate?.(`Found ${health.creatingPods} creating pods`);
				return health.creatingPods === 0;
			},
			interval,
			maxWaitTime
		);
		this.onUpdate?.(`All new pods of "${this.appName}" are finished creating`);
	}

	/**
	 * Wait until at least one new pod is running
	 */
	async waitUntilAtLeastOnePodIsRunning() {
		this.onUpdate?.(`Waiting until at least one new pod of "${this.appName}" is running...`);
		await waitUntil(
			async () => {
				const pods = await this.getPods();
				const health = await this.checkPodHealth(pods);
				this.onUpdate?.(`Found ${health.runningPods} running pods out of ${health.totalPods}`);

				// Check if any pods are crashed and throw an error if so
				if (health.crashedPods > 0) {
					throw new Error(`Found ${health.crashedPods} crashed pods out of ${health.totalPods}`);
				}

				return health.runningPods > 0;
			},
			5,
			5 * 60
		);
		this.onUpdate?.(`At least one new pod of "${this.appName}" is running`);
	}

	async isDeploymentReady(requiredReplicas: number, options?: { skipCrashedPods?: boolean }): Promise<boolean> {
		const pods = await this.getPods();
		if (!pods.length) {
			this.onUpdate?.(`No pods found for ${this.appName}`);
			return false;
		}

		const health = await this.checkPodHealth(pods);
		if (!options?.skipCrashedPods && !health.isHealthy) {
			this.onUpdate?.(`Found ${health.crashedPods} crashed pods out of ${health.totalPods}`);
			return false;
		}

		const readyPods = pods.filter((pod) => pod.status?.conditions?.some((c) => c.type === "Ready" && c.status === "True"));
		const isReady = readyPods.length >= requiredReplicas;
		if (!isReady) {
			this.onUpdate?.(`Found ${readyPods.length} ready pods out of ${requiredReplicas}`);
		}
		return isReady;
	}
}
