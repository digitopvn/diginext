import { isArray } from "lodash";

import type { INotification } from "@/entities/Notification";
import { notificationSchema } from "@/entities/Notification";
import type { IDataReferences, IWebhook } from "@/entities/Webhook";
import type { IQueryFilter, IQueryOptions } from "@/interfaces";
import type { Ownership, SystemEvent, WebhookChannel } from "@/interfaces/SystemTypes";
import { dxSendEmail } from "@/modules/diginext/dx-email";
import { MongoDB } from "@/plugins/mongodb";

import BaseService from "./BaseService";

export interface SendNotificationData {
	/**
	 * User ID of the sender
	 */
	from: string;
	/**
	 * User ID of the recicient
	 */
	to: string | string[];
	/**
	 * Notification's title
	 */
	title: string;
	/**
	 * Notification's content
	 */
	message?: string;
	/**
	 * The system event that triggered the notification
	 */
	events?: SystemEvent[];
	/**
	 * Target channels
	 */
	channels?: WebhookChannel[];
	/**
	 * Referenced data of a notification
	 */
	references?: IDataReferences;
	/**
	 * Callback URL of a notification
	 */
	url?: string;
}

export type SendNotificationWebhookData = Pick<SendNotificationData, "to" | "from" | "title" | "message" | "references" | "url">;

export class NotificationService extends BaseService<INotification> {
	constructor(ownership?: Ownership) {
		super(notificationSchema, ownership);
	}

	/**
	 * Send the notification via webhook
	 */
	async webhookSend(webhook: IWebhook, data: SendNotificationWebhookData, options?: IQueryOptions) {
		// validate
		if (!webhook) throw new Error(`Notification "webhook" is required.`);
		if (!data) throw new Error(`Notification "data" is required.`);
		// process & return
		return this.send({ ...data, channels: webhook.channels, events: webhook.events, from: MongoDB.toString(webhook.owner) }, options);
	}

	/**
	 * Send the notification directly
	 */
	async send(data: SendNotificationData, options?: IQueryOptions) {
		// validate
		if (!data) throw new Error(`Notification "data" is required.`);
		if (!data.to) throw new Error(`Notification recipient ID ("to") is required.`);
		if (!data.from) throw new Error(`Notification sender ID ("from") is required.`);
		if (!data.title) throw new Error(`Notification "title" is required.`);

		// process
		const { socketIO } = await import("@/server");
		const { UserService } = await import("./index");
		const userSvc = new UserService();
		const emailRecipients = await userSvc.find({ _id: { $in: isArray(data.to) ? data.to : [] } });
		const results = await Promise.all(
			data.channels.map((channel) => {
				switch (channel) {
					case "http_callback":
						// make a request here
						break;

					case "email":
						// make a email notification request here
						return dxSendEmail(
							{
								recipients: emailRecipients.map(({ name, email }) => ({ name, email })),
								subject: `[DIGINEXT / ${this.ownership.workspace.name}] ${data.title}`,
								content: `Hey,<br/><br/>You've got a notification from "${this.ownership.workspace.name}" workspace:<br/><br/>${data.message}<br/><br/>—<br/>You are receiving this because you are subscribed to this thread.<br/><a href="https://app.diginext.site/settings/notifications">Manage your Diginext notifications</a>`,
							},
							this.ownership.workspace.dx_key
						);
						break;

					case "web_push":
						// make a web push notification request here
						break;

					default:
						console.warn(`Webhook channel "${channel}" is invalid.`);
						break;
				}
			})
		);
		if (options?.isDebugging) console.log("[NOTIFICATION] SEND > results :>> ", results);

		// create db instance
		if (isArray(data.to)) {
			// multiple recipients
			return Promise.all(
				data.to.map((recipientId) => {
					// create notification
					const notiData: Partial<INotification> = {};
					notiData.owner = recipientId;
					notiData.name = data.title;
					notiData.message = data.message;
					notiData.from = data.from;
					notiData.events = data.events;
					notiData.channels = data.channels;
					notiData.references = data.references;
					return this.create(notiData, options);
				})
			).then((notifications) => {
				// emit websocket to clients
				notifications.map(({ owner: recipientId }) => {
					socketIO?.to(recipientId).emit("notification", { action: "new", message: "You have new notification" });
				});
				return notifications;
			});
		} else {
			// create notification -> single recipient
			const notiData: Partial<INotification> = {};
			notiData.owner = data.to;
			notiData.name = data.title;
			notiData.message = data.message;
			notiData.from = data.from;
			notiData.events = data.events;
			notiData.channels = data.channels;
			notiData.references = data.references;
			return this.create(notiData, options).then((noti) => {
				// emit websocket to clients
				socketIO?.to(noti.owner).emit("notification", { action: "new", message: "You have new notification" });
				return noti;
			});
		}
	}

	/**
	 * Mark the notification as read.
	 * @param id - Notification ID
	 */
	async markAsRead(filter: IQueryFilter<INotification> = {}, options?: IQueryOptions) {
		// process
		return this.updateOne(filter, { readAt: new Date() }, options);
	}
}
