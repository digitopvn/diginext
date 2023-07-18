import type { ObjectId } from "mongoose";
import { model, Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { AppStatus, BackupStatus, BuildStatus, DeployStatus, WebhookEvent } from "@/interfaces/SystemTypes";
import { webhookEventList, webhookEventStatusList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
import type { IWebhook } from "./Webhook";

export /**
 * An interface that extends IBase and describes the properties of an notification.
 *
 * @interface INotification
 * @extends {IBase}
 */
interface INotification extends IBase {
	/**
	 * The name of the notification.
	 *
	 * @type {string}
	 * @memberof INotification
	 */
	name?: string;

	/**
	 * A message associated with the notification.
	 *
	 * @type {string}
	 * @memberof INotification
	 */
	message?: string;

	/**
	 * A webhook associated with the notification.
	 *
	 * @type {string}
	 * @memberof INotification
	 */
	webhook?: string | ObjectId | IWebhook;

	/**
	 * The event that triggered the notification
	 */
	event: WebhookEvent;

	/**
	 * The status of the event (e.g., start, in_progress, failed, success, cancelled, deploying, sleep, awake, down, up)
	 */
	status: BuildStatus & DeployStatus & BackupStatus & AppStatus;
}

export type NotificationDto = Omit<INotification, keyof HiddenBodyKeys>;

export const notificationSchema = new Schema<INotification>(
	{
		...baseSchemaDefinitions,
		name: String,
		message: String,
		// webhook
		webhook: { type: Schema.Types.ObjectId, ref: "webhooks" },
		event: { type: String, enum: webhookEventList },
		status: { type: String, enum: webhookEventStatusList },
	},
	{ collection: "activities", timestamps: true }
);

export const NotificationModel = model<INotification>("Notification", notificationSchema, "activities");
