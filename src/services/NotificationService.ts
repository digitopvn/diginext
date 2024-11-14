import axios from "axios";
import { isArray } from "lodash";
import { z } from "zod";

import type { INotification } from "@/entities/Notification";
import { notificationSchema } from "@/entities/Notification";
import type { IWebhook } from "@/entities/Webhook";
import type { IQueryFilter, IQueryOptions } from "@/interfaces";
import { type Ownership, systemEventList, webhookChannelList } from "@/interfaces/SystemTypes";
import { dxSendEmail } from "@/modules/diginext/dx-email";
import { MongoDB } from "@/plugins/mongodb";

import BaseService from "./BaseService";

export const sendNotificationDataSchema = z.object({
	/**
	 * User ID of the sender
	 */
	from: z.string(),
	/**
	 * User ID of the recipient
	 */
	to: z.union([z.string(), z.array(z.string())]),
	/**
	 * Notification's title
	 */
	title: z.string(),
	/**
	 * Notification's content
	 */
	message: z.string().optional(),
	/**
	 * The system event that triggered the notification
	 */
	events: z.array(z.enum(systemEventList)).optional(),
	/**
	 * Target channels
	 */
	channels: z.array(z.enum(webhookChannelList)).optional(),
	/**
	 * Referenced data of a notification
	 */
	references: z.record(z.any()).optional(),
	/**
	 * Callback URL of a notification
	 */
	url: z.string().url().optional(),
});

export type SendNotificationData = z.infer<typeof sendNotificationDataSchema>;

export const sendNotificationWebhookDataSchema = sendNotificationDataSchema.pick({
	to: true,
	from: true,
	title: true,
	message: true,
	references: true,
	url: true,
});

export type SendNotificationWebhookData = z.infer<typeof sendNotificationWebhookDataSchema>;

const embedFieldSchema = z.object({
	name: z.string().optional(),
	value: z.string().optional(),
	inline: z.boolean().optional().default(false),
});

const embedImageSchema = z.object({
	url: z.string().url().optional(),
});

const embedAuthorSchema = z.object({
	name: z.string().optional(),
	icon_url: z.string().url().optional(),
});

const embedFooterSchema = z.object({
	text: z.string().optional(),
	icon_url: z.string().url().optional(),
});

const embedSchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	url: z.string().url().optional(),
	color: z.number().nullable().optional(),
	image: embedImageSchema.optional(),
	author: embedAuthorSchema.optional(),
	footer: embedFooterSchema.optional(),
	fields: z.array(embedFieldSchema).optional(),
});

const componentSchema = z
	.object({
		// Add component schema details if needed
	})
	.optional();

export const jojoWebhookSchema = z.object({
	channelId: z.string().optional(),
	content: z.string().optional(),
	embeds: z.array(embedSchema).optional(),
	components: z.array(componentSchema).optional(),
});

export type JojoWebhookData = z.infer<typeof jojoWebhookSchema>;

export const sendJojoNotificationDataSchema = jojoWebhookSchema.pick({
	channelId: true,
	content: true,
	embeds: true,
	components: true,
});

export type SendJojoNotificationData = z.infer<typeof sendJojoNotificationDataSchema>;

export class NotificationService extends BaseService<INotification> {
	private readonly JOJO_API_KEY = process.env.JOJO_API_KEY;

	private readonly JOJO_API_URL = "https://app.digicord.site/api/v1/send-data";

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
								content: `Hey,<br/><br/>You've got a notification from "${this.ownership.workspace.name}" workspace:<br/><br/>${data.message}<br/><br/>—<br/>You are receiving this because you are subscribed to this thread.<br/><a href="https://app.dxup.dev/settings/notifications">Manage your Diginext notifications</a>`,
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
			)
				.then((notifications) => {
					// emit websocket to clients
					notifications.map(({ owner: recipientId }) => {
						socketIO?.to(recipientId.toString()).emit("notification", { action: "new", message: "You have new notification" });
					});
					return notifications;
				})
				.catch((e) => {
					console.error(`Unable to send notification:`, e);
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
			return this.create(notiData, options)
				.then((noti) => {
					// emit websocket to clients
					socketIO?.to(noti.owner.toString()).emit("notification", { action: "new", message: "You have new notification" });
					return noti;
				})
				.catch((e) => {
					console.error(`Unable to send notification:`, e);
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

	/**
	 * Send the notification to Jojo
	 */
	async sendToJojo(data: SendJojoNotificationData, options?: IQueryOptions) {
		if (!this.JOJO_API_KEY) throw new Error(`Jojo API key is not set.`);
		// process
		if (options?.isDebugging) console.log("[NOTIFICATION] SEND TO JOJO > data :>> ", data);
		const jojoData = jojoWebhookSchema.parse(data);
		const response = await axios.post(this.JOJO_API_URL, jojoData, { headers: { Authorization: `Bearer ${this.JOJO_API_KEY}` } });
		if (options?.isDebugging) console.log("[NOTIFICATION] SEND TO JOJO > response :>> ", response);
		return response.data;
	}
}
