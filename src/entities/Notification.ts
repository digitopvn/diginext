import type { ObjectId } from "mongoose";
import { model, Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { AppStatus, BackupStatus, BuildStatus, DeployStatus, SystemEvent, WebhookChannel } from "@/interfaces/SystemTypes";
import { systemEventList, webhookChannelList, webhookEventStatusList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
import type { IUser } from "./User";
import type { IDataReferences, IWebhook } from "./Webhook";

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
	 * A user ID who sent the notification.
	 *
	 * @type {string}
	 * @memberof INotification
	 */
	from?: string | ObjectId | IUser;

	/**
	 * A webhook associated with the notification.
	 *
	 * @type {string}
	 * @memberof INotification
	 */
	webhook?: string | ObjectId | IWebhook;

	/**
	 * The system event that triggered the notification
	 */
	events?: SystemEvent[];

	/**
	 * The status of the event (e.g., start, in_progress, failed, success, cancelled, deploying, sleep, awake, down, up)
	 */
	status?: BuildStatus & DeployStatus & BackupStatus & AppStatus;

	/**
	 * A list of {IWebhook} channels.
	 */
	channels?: WebhookChannel[];

	/**
	 * Callback URL of a notification
	 */
	url?: string;

	/**
	 * The date the user read or mark a notitication as read
	 */
	readAt?: Date;

	/**
	 * Referenced data of a notification
	 */
	references?: IDataReferences;
}

export type NotificationDto = Omit<INotification, keyof HiddenBodyKeys>;

export const notificationSchema = new Schema<INotification>(
	{
		...baseSchemaDefinitions,
		name: String,
		message: String,
		url: String,
		events: [{ type: String, enum: systemEventList }],
		status: { type: String, enum: webhookEventStatusList },
		from: { type: Schema.Types.ObjectId, ref: "users" },
		channels: [{ type: String, enum: webhookChannelList }],
		// webhook
		webhook: { type: Schema.Types.ObjectId, ref: "webhooks" },
		// timing
		readAt: { type: Date },
		references: { type: Schema.Types.Mixed },
	},
	{ collection: "notifications", timestamps: true }
);

export const NotificationModel = model<INotification>("Notification", notificationSchema, "notifications");
