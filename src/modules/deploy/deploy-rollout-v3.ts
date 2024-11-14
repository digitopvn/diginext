import chalk from "chalk";
import { logSuccess } from "diginext-utils/dist/xconsole/log";

import type { IUser, IWorkspace } from "@/entities";

import {
	authenticateCluster,
	checkContainerLogsForErrors,
	checkDomainConflict,
	DeploymentPreparator,
	DeploymentReadinessChecker,
	DeploymentScaler,
	DeploymentYamlProcessor,
	finalizeReleaseAndBuild,
	handleRolloutFailure,
	prepareReleaseData,
	retrieveContainerLogs,
	setupWebhookService,
	updateProjectAndAppMetadata,
} from "./utils";

export interface RolloutOptions {
	isDebugging?: boolean;
	onUpdate?: (msg?: string) => void;
}

export async function rolloutV3(releaseId: string, options: RolloutOptions = {}) {
	const { onUpdate } = options;

	// 1. Validate and prepare release data
	const releaseData = await prepareReleaseData(releaseId, onUpdate);
	if (!releaseData) return { error: "Release preparation failed" };

	const { projectSlug, cluster: clusterSlug, appSlug, deploymentYaml, endpoint: endpointUrl, namespace, env, message } = releaseData;

	const buildId = releaseData.build as string;
	const owner = releaseData.owner as IUser;
	const workspace = releaseData.workspace as IWorkspace;

	// 2. Setup webhook and services
	const { webhookSvc } = await setupWebhookService(owner, workspace, releaseId);

	// 3. Authenticate and prepare cluster
	const cluster = await authenticateCluster(clusterSlug, owner, workspace, onUpdate);
	if (!cluster) return handleRolloutFailure(releaseId, buildId, webhookSvc, "Cluster authentication failed");

	// 4. Prepare deployment
	const yamlProcessor = new DeploymentYamlProcessor(deploymentYaml);
	const preparator = new DeploymentPreparator(cluster, namespace, appSlug, env);

	try {
		await preparator.prepareNamespace(onUpdate);
		await preparator.createImagePullSecrets(onUpdate);
	} catch (error) {
		return await handleRolloutFailure(releaseId, buildId, webhookSvc, error.message);
	}

	// Before scaling deployment, check domain conflicts
	if (yamlProcessor.ingressConfig) {
		const isDomainConflict = await checkDomainConflict(yamlProcessor.ingressConfig, namespace, cluster.contextName, onUpdate);
		if (isDomainConflict) {
			return handleRolloutFailure(releaseId, buildId, webhookSvc, "Domain conflict detected");
		}
	}

	// 5. Apply new deployment
	const deploymentDetails = yamlProcessor.processDeploymentYaml();
	const { deploymentName, appVersion, newReplicas } = deploymentDetails;
	const processedYaml = yamlProcessor.getProcessedYaml();

	try {
		await preparator.applyDeployment(processedYaml, message || appVersion, onUpdate);
	} catch (error) {
		return await handleRolloutFailure(releaseId, buildId, webhookSvc, `Deployment application failed: ${error.message}`);
	}

	// 6. Check deployment readiness
	let isDeploymentReady = true;
	const readinessChecker = new DeploymentReadinessChecker(cluster.contextName, namespace, deploymentDetails.mainAppName, appVersion, onUpdate);

	// wait until no creating pods
	await readinessChecker.waitUntilNoCreatingPods();

	// wait until at least one new pod is running
	await readinessChecker.waitUntilAtLeastOnePodIsRunning().catch((error) => {
		isDeploymentReady = false;
		return handleRolloutFailure(releaseId, buildId, webhookSvc, `Deployment failed to become ready: ${error.message}`);
	});

	// After deployment readiness check
	const containerLogs = await retrieveContainerLogs(namespace, appVersion, cluster.contextName, isDeploymentReady);

	if (onUpdate && containerLogs) {
		onUpdate(`--------------- APP'S LOGS ON STARTED UP --------------- \n${containerLogs}`);
	}

	if (checkContainerLogsForErrors(containerLogs)) {
		// get latest 100 lines of container logs
		const latestLogs = containerLogs.split("\n").slice(-100).join("\n");
		let aiAnalysis = "";
		if (workspace.settings?.ai?.enabled) {
			const { AIService } = await import("@/services/AIService");
			const aiService = new AIService({ owner, workspace });
			aiAnalysis += "\n\n---- AI ANALYSIS ----\n";
			aiAnalysis += await aiService.analyzeErrorLog(latestLogs).catch((e) => {
				console.error(e);
				return `AI service is currently unavailable: ${e.message}`;
			});
		}
		return handleRolloutFailure(
			releaseId,
			buildId,
			webhookSvc,
			`Application startup failed. Check logs for details. \n\n${containerLogs}${aiAnalysis}`
		);
	}

	// Update project and app metadata
	await updateProjectAndAppMetadata(releaseData, buildId, owner);

	// 7. Scale deployment
	const scaler = new DeploymentScaler(cluster.contextName, namespace, onUpdate);
	await scaler.scaleDeployment(deploymentName, newReplicas);

	// 8. Cleanup old resources
	// if (!IsTest() && isServerMode) {
	// 	const cleaner = new DeploymentCleaner(cluster.contextName, namespace, onUpdate);
	// 	await cleaner.cleanupOldDeployments(deploymentDetails.mainAppName, appVersion);
	// }

	// 9. Finalize release and build status
	await finalizeReleaseAndBuild(releaseId, buildId, projectSlug, appSlug, env, owner);

	// 10. Success logging
	const prodUrlInCLI = chalk.bold(`https://${endpointUrl}`);
	const successMsg = `🎉 PUBLISHED AT: ${prodUrlInCLI} 🎉`;
	logSuccess(successMsg);
	onUpdate?.(successMsg);

	return { error: null, data: releaseData };
}
