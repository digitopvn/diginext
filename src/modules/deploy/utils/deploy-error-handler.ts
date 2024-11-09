import { logError } from "diginext-utils/dist/xconsole/log";

import type { WebhookEventStatus } from "@/interfaces/SystemTypes";
import { MongoDB } from "@/plugins/mongodb";
import { WebhookService } from "@/services";

export interface DeploymentErrorContext {
	releaseId: string;
	buildId: string;
	appSlug: string;
	env: string;
	namespace: string;
	cluster: string;
}

export class DeploymentErrorHandler {
	private webhookService: WebhookService;

	private db: any;

	constructor(db: any) {
		this.webhookService = new WebhookService();
		this.db = db;
	}

	async handleDeploymentError(
		error: Error | string,
		context: DeploymentErrorContext,
		onUpdate?: (msg: string) => void
	): Promise<{ error: string }> {
		const errorMessage = typeof error === "string" ? error : error.message;

		// Log error
		logError(`Deployment Error: ${errorMessage}`);

		// Trigger webhook if exists
		await this.triggerWebhook(context, "failed");

		// Update release status
		await this.updateReleaseStatus(context, "failed");

		// Update build status
		await this.updateBuildStatus(context, "failed");

		// Notify update callback
		if (onUpdate) {
			onUpdate(errorMessage);
		}

		return { error: errorMessage };
	}

	private async triggerWebhook(context: DeploymentErrorContext, status: WebhookEventStatus) {
		try {
			const webhook = await this.db.findOne("webhook", { release: context.releaseId });
			if (webhook) {
				this.webhookService.trigger(MongoDB.toString(webhook._id), status);
			}
		} catch (e) {
			logError(`Webhook trigger failed: ${e.message}`);
		}
	}

	private async updateReleaseStatus(context: DeploymentErrorContext, status: "failed" | "success") {
		try {
			await this.db.update("release", { _id: context.releaseId }, { status }, { select: ["_id", "status"] });
		} catch (e) {
			logError(`Release status update failed: ${e.message}`);
		}
	}

	private async updateBuildStatus(context: DeploymentErrorContext, status: "failed" | "success") {
		try {
			await this.db.update("build", { _id: context.buildId }, { deployStatus: status }, { select: ["_id", "deployStatus"] });
		} catch (e) {
			logError(`Build status update failed: ${e.message}`);
		}
	}
}
