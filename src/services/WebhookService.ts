import humanizeDuration from "humanize-duration";

import { Config } from "@/app.config";
import type { IApp, IBuild, IProject, IUser, IWorkspace } from "@/entities";
import type { IDataReferences, IWebhook } from "@/entities/Webhook";
import { webhookSchema } from "@/entities/Webhook";
import type { IQueryOptions } from "@/interfaces";
import type { Ownership, SystemEvent, WebhookChannel, WebhookEventStatus } from "@/interfaces/SystemTypes";
import { MongoDB } from "@/plugins/mongodb";

import BaseService from "./BaseService";
import { NotificationService } from "./NotificationService";

export interface WebhookDto extends IDataReferences {
	/**
	 * Array of webhook events to subscribe to
	 */
	events: SystemEvent[];
	/**
	 * Array of User ID
	 * @default []
	 */
	consumers?: string[];
	/**
	 * Array of webhook channels to receive
	 * @default ["email"]
	 */
	channels?: WebhookChannel[];
}

export class WebhookService extends BaseService<IWebhook> {
	notiSvc: NotificationService;

	constructor(ownership?: Ownership) {
		super(webhookSchema, ownership);
		this.notiSvc = new NotificationService(ownership);
	}

	async create(data: WebhookDto, options?: IQueryOptions) {
		if (!data.events) throw new Error(`Webhook "events" (Array) is required.`);
		if (!data.channels) data.channels = ["email"];
		if (!data.consumers) data.consumers = [];
		data.consumers.forEach((userId) => {
			if (!MongoDB.isValidObjectId(userId)) throw new Error(`Invalid "consumers" array, should be a valid list of user ID.`);
		});

		data.events.forEach((event) => {
			switch (event) {
				case "build_status":
					if (!data.build) throw new Error(`Missing a referenced "build" associated with the webhook event "${event}".`);
					break;

				case "deploy_status":
					if (!data.release) throw new Error(`Missing a referenced "release" associated with the webhook event "${event}".`);
					break;

				default:
					break;
			}
		});

		return super.create(data, options);
	}

	/**
	 * Trigger a webhook & send the notification
	 * @param id - Webhook ID
	 * @param status - Webhook event status
	 */
	async trigger(id: string, status: WebhookEventStatus, options?: IQueryOptions) {
		// validate
		if (!id) throw new Error(`Webhook "id" is required.`);
		if (!status) throw new Error(`Webhook "status" is required.`);

		const webhook = await this.updateOne({ _id: id }, { status }, options);
		if (!webhook) throw new Error(`Webhook not found.`);

		// process
		const { DB } = await import("@/modules/api/DB");
		this.notiSvc.ownership = this.ownership;
		return Promise.all(
			webhook.events.map((event) => {
				switch (event) {
					case "build_status":
						if (webhook.status === "failed" || webhook.status === "success") {
							return DB.findOne("build", { _id: webhook.build }, { populate: ["workspace", "owner", "project", "app"] })
								.then((ref) => {
									const BUILD_LOG_ROOM = `${ref?.appSlug}-${ref?.tag}`;
									const logURL = `${Config.BASE_URL}/build/logs?build_slug=${BUILD_LOG_ROOM}`;
									const duration = humanizeDuration(ref.duration);
									const owner = ref.owner as IUser;
									return this.notiSvc.webhookSend(webhook, {
										references: { build: MongoDB.toString(ref._id) },
										url: logURL,
										from: MongoDB.toString(webhook.owner),
										to: webhook.consumers.map((recipientId) => MongoDB.toString(recipientId)),
										title: webhook.status === "failed" ? `Build failed: ${ref?.name}` : `Build success: ${ref?.name}`,
										message: `- Workspace: ${this.ownership.workspace.name}<br/>- Project: ${
											(ref?.project as IProject).name
										}<br/>- App: ${(ref?.app as IApp).name}<br/>- User: ${owner.name} (${
											owner.slug
										})<br/>- Duration: ${duration}<br/>- View logs: <a href="${logURL}">CLICK HERE</a><br/>- Container image: ${ref?.image}`,
									});
								})
								.catch((e) => {
									console.error(`Unable to trigger webhook:`, e);
								});
						}
						break;

					case "deploy_status":
						if (webhook.status === "failed" || webhook.status === "success") {
							return DB.findOne("release", { _id: webhook.release }, { populate: ["workspace", "owner", "project", "app", "build"] })
								.then((ref) => {
									const build = ref?.build as IBuild;
									const BUILD_LOG_ROOM = `${build.appSlug}-${build.tag}`;
									const buildListPageUrl = `${Config.BASE_URL}/build`;
									const logURL = `${Config.BASE_URL}/build/logs?build_slug=${BUILD_LOG_ROOM}`;
									const duration = humanizeDuration(build.duration);
									const owner = ref.owner as IUser;
									return this.notiSvc.webhookSend(webhook, {
										references: { release: MongoDB.toString(ref._id) },
										url: logURL,
										from: MongoDB.toString(webhook.owner),
										to: webhook.consumers.map((recipientId) => MongoDB.toString(recipientId)),
										title: webhook.status === "failed" ? `Deploy failed: ${ref?.name}` : `Deploy success: ${ref?.name}`,
										message:
											(webhook.status === "failed"
												? `Failed to deploy "${ref?.appSlug}" app of "${ref?.projectSlug}" project to "${ref?.env.toUpperCase()}" environment.<br/>- View build logs: <a href="${logURL}">CLICK HERE</a><br/>- Duration: ${duration}`
												: `<strong>App has been deployed to "${ref?.env.toUpperCase()}" environment successfully.</strong><br/><br/>- Workspace: ${
														(ref?.workspace as IWorkspace).name
												  }<br/>- User: ${owner.name} (${
														owner.slug
												  })<br/>- App: ${ref?.appSlug}<br/>- Project: ${ref?.projectSlug}<br/>- URL: <a href="https://${
														ref?.env === "production" ? ref?.prereleaseUrl : ref?.productionUrl
												  }">CLICK TO VIEW</a><br/>- View build logs: <a href="${logURL}">CLICK HERE</a><br/>- Duration: ${duration}<br/>- Container Image: ${ref?.image}`) +
											`<br/><br/>Go to <a href="${buildListPageUrl}">DXUP Dashboard</a>.<br/><br/>Best regards, <a href="https://dxup.dev">DXUP</a> Team.`,
									});
								})
								.catch((e) => {
									console.error(`Unable to trigger webhook:`, e);
								});
						}
						break;

					default:
						throw new Error(`Invalid webhook event: "${event}".`);
						break;
				}
			})
		);
	}

	/**
	 * Subscribe a consumer to a webhook
	 * @param id - Webhook ID
	 * @param data - Subscription data
	 */
	async subscribe(id: string, consumers: string[], options?: IQueryOptions) {
		// validate
		if (!id) throw new Error(`Webhook ID is required.`);
		if (!consumers) throw new Error(`Webhook "consumers" (Array of UserID) is required.`);

		const webhook = await this.updateOne(
			{ id },
			// add consumers to existing webhook if it's not exists
			{
				$addToSet: {
					consumers: { $each: consumers },
				},
			},
			{ raw: true }
		);
		if (!webhook) throw new Error(`Webhook not found.`);

		return webhook;
	}
}
