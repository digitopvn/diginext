import { logError, logWarn } from "diginext-utils/dist/xconsole/log";

import type { ICluster } from "@/entities";
import ClusterManager from "@/modules/k8s";

export class DeploymentPreparator {
	constructor(
		private readonly cluster: ICluster,
		private readonly namespace: string,
		private readonly appSlug: string,
		private readonly env: string
	) {}

	async prepareNamespace(onUpdate?: (msg: string) => void): Promise<boolean> {
		const { contextName: context } = this.cluster;

		// Check if namespace exists
		const isNsExisted = await ClusterManager.isNamespaceExisted(this.namespace, { context });

		if (!isNsExisted) {
			const message = `Namespace "${this.namespace}" not found, creating one...`;
			onUpdate?.(message);
			logWarn(message);

			const createNsRes = await ClusterManager.createNamespace(this.namespace, { context });

			if (!createNsRes) {
				const error = `Unable to create new namespace: ${this.namespace}`;
				onUpdate?.(error);
				throw new Error(error);
			}

			return true;
		}

		return false;
	}

	async createImagePullSecrets(onUpdate?: (msg: string) => void): Promise<{ name: string }> {
		const { contextName: context } = this.cluster;

		try {
			const { name: imagePullSecretName } = await ClusterManager.createImagePullSecretsInNamespace(
				this.appSlug,
				this.env,
				this.cluster.slug,
				this.namespace
			);

			const message = `Created "${imagePullSecretName}" imagePullSecrets in the "${this.namespace}" namespace`;
			onUpdate?.(message);

			return { name: imagePullSecretName };
		} catch (error) {
			if (error.message.indexOf("already exists") > -1) {
				const message = `ImagePullSecrets "${this.appSlug}" already exists in the "${this.namespace}" namespace`;
				onUpdate?.(message);
				return { name: this.appSlug };
			}

			logError(`[DeploymentPreparator > createImagePullSecrets]`, error);
			const errorMessage = `Can't create imagePullSecrets: ${error.message}`;
			onUpdate?.(errorMessage);
			throw new Error(errorMessage);
		}
	}

	async applyDeployment(processedYaml: string, message: string, onUpdate?: (msg: string) => void): Promise<void> {
		const { contextName: context } = this.cluster;

		try {
			// Apply the deployment YAML
			await ClusterManager.kubectlApplyContent(processedYaml, { context });

			const applyMessage = `Applied new deployment YAML successfully.`;
			onUpdate?.(applyMessage);

			// Annotate the deployment
			const deploymentName = this.extractDeploymentName(processedYaml);
			if (deploymentName) {
				const annotation = `kubernetes.io/change-cause="${message}"`;
				await ClusterManager.kubectlAnnotateDeployment(annotation, deploymentName, this.namespace, {
					context,
				});

				const annotateMessage = `Annotated deployment "${deploymentName}" with "${annotation}"`;
				onUpdate?.(annotateMessage);
			}
		} catch (error) {
			const errorMessage = `Failed to apply deployment: ${error.message}`;
			onUpdate?.(errorMessage);
			throw new Error(errorMessage);
		}
	}

	private extractDeploymentName(yaml: string): string | null {
		const deploymentNameMatch = yaml.match(/metadata:\n\s*name:\s*([^\n]+)/);
		return deploymentNameMatch ? deploymentNameMatch[1].trim() : null;
	}
}
