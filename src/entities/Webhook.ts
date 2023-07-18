import type { ObjectId } from "mongoose";
import { model, Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { WebhookChannel, WebhookEvent } from "@/interfaces/SystemTypes";
import { webhookChannelList, webhookEventList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
import type { ITeam } from "./Team";
import type { IUser } from "./User";

export /**
 * An interface that extends IBase and describes the properties of an webhook.
 *
 * @interface IWebhook
 * @extends {IBase}
 */
interface IWebhook extends IBase {
	/**
	 * The name of the webhook.
	 *
	 * @type {string}
	 * @memberof IWebhook
	 */
	name?: string;

	/**
	 * A message associated with the webhook.
	 *
	 * @type {string}
	 * @memberof IWebhook
	 */
	message?: string;

	/**
	 * A list of {IUser} that subscribed to this webhook.
	 */
	consumers?: string[] | ObjectId[] | IUser[];

	/**
	 * A list of {ITeam} that subscribed to this webhook.
	 */
	consumerGroups?: string[] | ObjectId[] | ITeam[];

	/**
	 * A list of {IWebhook} events.
	 */
	events?: WebhookEvent[];

	/**
	 * A list of {IWebhook} channels.
	 */
	channels?: WebhookChannel[];

	/**
	 * The callback URL of the webhook.
	 *
	 * @type {string}
	 * @memberof IWebhook
	 */
	url?: string;

	/**
	 * The HTTP method used for the webhook.
	 *
	 * @type {string}
	 * @memberof IWebhook
	 */
	method?: string;

	/**
	 * The request headers of a callback URL.
	 *
	 * @type {*}
	 * @memberof IWebhook
	 */
	headers?: any;

	/**
	 * The request body of a callback URL.
	 *
	 * @type {*}
	 * @memberof IWebhook
	 */
	body?: any;

	/**
	 * The HTTP status code (200, 403, 503,...) returned from the webhook.
	 *
	 * @type {*}
	 * @memberof IWebhook
	 */
	httpStatus?: any;

	/**
	 * The response status code (0 or 1) returned from the webhook.
	 *
	 * @type {number}
	 * @memberof IWebhook
	 */
	responseStatus?: number;
}

export type WebhookDto = Omit<IWebhook, keyof HiddenBodyKeys>;

export const webhookSchema = new Schema<IWebhook>(
	{
		...baseSchemaDefinitions,
		name: String,
		message: String,
		events: [{ type: String, enum: webhookEventList }],
		channels: [{ type: String, enum: webhookChannelList }],
		// consumers
		consumers: [{ type: Schema.Types.ObjectId, ref: "users" }],
		consumerGroups: [{ type: Schema.Types.ObjectId, ref: "teams" }],
		// callback
		url: String,
		method: String,
		headers: Schema.Types.Mixed,
		body: Schema.Types.Mixed,
		httpStatus: Schema.Types.Mixed,
		responseStatus: Number,
	},
	{ collection: "webhooks", timestamps: true }
);

export const WebhookModel = model<IWebhook>("Webhook", webhookSchema, "webhooks");
