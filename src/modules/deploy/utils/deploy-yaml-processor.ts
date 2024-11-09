import yaml from "js-yaml";

import type { KubeDeployment, KubeIngress, KubeService } from "@/interfaces";
import { makeSlug } from "@/plugins/slug";

export interface DeploymentDetails {
	deploymentName: string;
	mainAppName: string;
	appVersion: string;
	newReplicas: number;
}

export class DeploymentYamlProcessor {
	originalYaml: string;

	ingressConfig: KubeIngress;

	serviceConfig: KubeService;

	deploymentConfig: KubeDeployment;

	private processedYamlConfigs: any[];

	constructor(deploymentYaml: string) {
		this.originalYaml = deploymentYaml;
		this.processedYamlConfigs = yaml.loadAll(deploymentYaml);
	}

	processDeploymentYaml(): DeploymentDetails {
		let deploymentName = "";
		let mainAppName = "";
		let appVersion = "";
		let newReplicas = 1;

		this.processedYamlConfigs.forEach((doc: any) => {
			if (doc && doc.kind === "Ingress") {
				this.ingressConfig = doc;
			}

			if (doc && doc.kind === "Service") {
				this.serviceConfig = doc;
			}

			if (doc && doc.kind === "Deployment") {
				this.deploymentConfig = doc;

				// Extract deployment name
				deploymentName = doc.metadata.name;

				// Extract or generate main app name
				mainAppName = doc.metadata.labels?.["main-app"] || makeSlug(doc.metadata.name).toLowerCase();

				// Extract app version
				appVersion = doc.metadata.labels?.["app-version"] || `${mainAppName}-${Date.now()}`;

				// Store original replica count
				newReplicas = doc.spec.replicas || 1;

				// Temporarily set replicas to 2 to avoid downtime
				doc.spec.replicas = 2;

				// Ensure version label is set
				doc.metadata.labels = doc.metadata.labels || {};
				doc.metadata.labels["app-version"] = appVersion;
				doc.metadata.labels["main-app"] = mainAppName;

				// Add labels to pod template
				doc.spec.template.metadata = doc.spec.template.metadata || {};
				doc.spec.template.metadata.labels = {
					...doc.spec.template.metadata.labels,
					"app-version": appVersion,
					"main-app": mainAppName,
				};
			}
		});

		if (!deploymentName) {
			throw new Error("No deployment configuration found in the YAML");
		}

		return {
			deploymentName,
			mainAppName,
			appVersion,
			newReplicas,
		};
	}

	getProcessedYaml(): string {
		if (!this.processedYamlConfigs) {
			throw new Error("YAML has not been processed yet");
		}

		return this.processedYamlConfigs.map((config) => yaml.dump(config)).join("---\n");
	}
}
