import { log, logError, logSuccess } from "diginext-utils/dist/xconsole/log";

import type { IRelease, IUser, IWorkspace } from "@/entities";
import type { KubeIngress } from "@/interfaces";
import ClusterManager from "@/modules/k8s";
import { logPodByFilter } from "@/modules/k8s/kubectl";
import { MongoDB } from "@/plugins/mongodb";
import { AppService, BuildService, ClusterService, ProjectService, ReleaseService, WebhookService } from "@/services";

import { markReleaseAsActive } from "../mark-release-as-active";
import type { DeploymentReadinessChecker } from "./deploy-checker";

// Helper functions would be implemented similarly, extracting logic from the original function
export async function prepareReleaseData(releaseId: string, DB: any, onUpdate?: (msg?: string) => void) {
	// Step 1: Validate input
	if (!releaseId) {
		const error = "Release ID is required";
		onUpdate?.(error);
		return null;
	}

	// Step 2: Update release status to in_progress
	const releaseData = await DB.updateOne("release", { _id: releaseId }, { status: "in_progress" }, { populate: ["owner", "workspace", "build"] });

	// Step 3: Validate release data
	if (!releaseData) {
		const error = `Unable to roll out: Release "${releaseId}" not found.`;
		onUpdate?.(error);
		return null;
	}

	// Step 4: Log update
	if (onUpdate) {
		onUpdate(`Rolling out the release: "${releaseData.slug}" (ID: ${releaseId})`);
	}

	// Step 5: Return prepared release data
	return releaseData;
}

export async function setupWebhookService(owner: IUser, workspace: IWorkspace, releaseId: string) {
	// Step 1: Initialize webhook service
	const webhookSvc = new WebhookService();
	webhookSvc.ownership = { owner, workspace };

	// Step 2: Find existing webhook for this release
	const webhook = await webhookSvc.findOne({ release: releaseId });

	// Step 3: Return webhook service with optional webhook
	return { webhookSvc, webhook };
}

export async function authenticateCluster(clusterSlug: string, owner: IUser, workspace: IWorkspace, onUpdate?: (msg?: string) => void) {
	const clusterSvc = new ClusterService();

	// Step 1: Find cluster
	const cluster = await clusterSvc.findOne({ slug: clusterSlug }, { subpath: "/all" });

	// Step 2: Validate cluster existence
	if (!cluster) {
		const error = `Cluster "${clusterSlug}" not found.`;
		logError(error);
		onUpdate?.(error);
		return null;
	}

	// Step 3: Authenticate cluster
	try {
		await ClusterManager.authCluster(cluster, { ownership: { owner, workspace } });

		if (onUpdate) {
			onUpdate(`Connected to "${clusterSlug}" cluster successfully.`);
		}

		return cluster;
	} catch (e) {
		const error = `Unable to authenticate the cluster: ${e.message}`;
		logError(`[AUTHENTICATE_CLUSTER] ${error}`);
		onUpdate?.(error);
		return null;
	}
}

export async function checkDeploymentReadiness(readinessChecker: DeploymentReadinessChecker, requiredReplicas: number): Promise<boolean> {
	try {
		// Step 1: Check deployment readiness
		const pods = await readinessChecker.getPods();
		const health = await readinessChecker.checkPodHealth(pods);
		console.log("checkDeploymentReadiness() :>>", health);

		// Step 2: Log readiness status
		log(`Deployment readiness check: ${health.isHealthy ? "READY" : "NOT READY"}`);

		return health.isHealthy;
	} catch (error) {
		// Step 3: Handle errors
		logError(`Deployment readiness check failed: ${error.message}`);
		return false;
	}
}

export async function handleRolloutFailure(releaseId: string, buildId: string, webhookSvc: WebhookService, errorMessage: string) {
	const releaseSvc = new ReleaseService();
	const buildSvc = new BuildService();

	// Step 1: Trigger webhook if available
	const webhook = await webhookSvc.findOne({ release: releaseId });
	if (webhook) {
		webhookSvc.trigger(MongoDB.toString(webhook._id), "failed");
	}

	// Step 2: Update release status
	await releaseSvc.updateOne({ _id: releaseId }, { status: "failed" }).catch(console.error);

	// Step 3: Update build deployment status
	await buildSvc.updateOne({ _id: buildId }, { deployStatus: "failed" }, { select: ["_id", "deployStatus"] }).catch(console.error);

	// Step 4: Log error
	logError(`Rollout failure: ${errorMessage}`);

	// Step 5: Return error object
	return {
		error: errorMessage,
		data: { releaseId, buildId },
	};
}

export async function finalizeReleaseAndBuild(releaseId: string, buildId: string, projectSlug: string, appSlug: string, env: string, owner: IUser) {
	const buildSvc = new BuildService();
	const projectSvc = new ProjectService();
	const appSvc = new AppService();

	// 1. Mark this release as active
	try {
		const latestRelease = await markReleaseAsActive({ id: releaseId, appSlug, env });
		if (!latestRelease) throw new Error(`Release "${releaseId}" not found.`);
	} catch (e) {
		const error = `[ERROR] Unable to mark the latest release (${releaseId}) status as "active": ${e.message}`;
		logError(error);
		throw new Error(error);
	}

	// 2. Update build deployment status to success
	const build = await buildSvc.updateOne({ _id: buildId }, { deployStatus: "success" });

	// 3. Update project with latest build and updater
	await projectSvc.updateOne({ slug: projectSlug }, { lastUpdatedBy: owner.username, latestBuild: build?._id }, { select: ["_id", "updatedAt"] });

	// 4. Update app's deployment environment with latest release details
	const appUpdateData = {
		[`deployEnvironment.${env}.latestRelease`]: releaseId,
		[`deployEnvironment.${env}.appVersion`]: build?.tag,
		[`deployEnvironment.${env}.buildId`]: buildId,
	};

	await appSvc.updateOne({ slug: appSlug }, appUpdateData, { select: ["_id"] });

	// Log success
	logSuccess(`✅ Successfully finalized release and build for "${appSlug}"`);
}

export async function retrieveContainerLogs(namespace: string, appVersion: string, context: string, isNewDeploymentReady: boolean): Promise<string> {
	try {
		const logOptions = {
			filterLabel: `app-version=${appVersion}`,
			context,
			...(isNewDeploymentReady ? {} : { previous: true }),
		};

		const containerLogs = await logPodByFilter(namespace, logOptions);
		return containerLogs;
	} catch (error) {
		logError(`Failed to retrieve container logs: ${error}`);
		return "";
	}
}

export function checkContainerLogsForErrors(containerLogs: string): boolean {
	const errorPatterns = ["Error from server", "An error occurred", "Command failed", "Unexpected Server Error"];

	return errorPatterns.some((pattern) => containerLogs.includes(pattern));
}

export async function checkDomainConflict(
	ingress: KubeIngress,
	namespace: string,
	context: string,
	onUpdate?: (msg: string) => void
): Promise<boolean> {
	if (!ingress || !ingress.spec?.rules) return false;

	const domains = ingress.spec.rules.map((rule) => rule.host).filter(Boolean);
	if (domains.length === 0) return false;

	const allIngresses = await ClusterManager.getAllIngresses({ context });

	for (const domain of domains) {
		const conflictingIngress = allIngresses.find(
			(ing) => ing.spec.rules.some((rule) => rule.host === domain) && ing.metadata.namespace !== namespace
		);

		if (conflictingIngress) {
			const error = `Domain "${domain}" is already in use in namespace "${conflictingIngress.metadata.namespace}"`;
			onUpdate?.(error);
			return true;
		}
	}

	return false;
}

export async function updateProjectAndAppMetadata(releaseData: IRelease, buildId: string, owner: IUser) {
	const { projectSlug, appSlug, env, _id: releaseId } = releaseData;

	const buildSvc = new BuildService();
	const projectSvc = new ProjectService();
	const appSvc = new AppService();

	// Update "deployStatus" of a build to success
	const build = await buildSvc.updateOne({ _id: buildId }, { deployStatus: "success" }, { select: ["_id", "deployStatus"] });

	// Update project to sort by latest release
	const project = await projectSvc.updateOne(
		{ slug: projectSlug },
		{
			lastUpdatedBy: owner.username,
			latestBuild: build?._id,
		},
		{ select: ["_id", "updatedAt"] }
	);

	// Assign this release as "latestRelease" of this app's deploy environment
	const app = await appSvc.updateOne(
		{ slug: appSlug },
		{
			[`deployEnvironment.${env}.latestRelease`]: releaseId,
			[`deployEnvironment.${env}.appVersion`]: releaseData.appVersion,
			[`deployEnvironment.${env}.buildId`]: buildId,
		},
		{ select: ["_id"] }
	);

	return { project, app, build };
}
