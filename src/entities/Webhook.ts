import type { ObjectId } from "mongoose";
import { model, Schema } from "mongoose";

import type { SystemEvent, WebhookChannel, WebhookEventStatus } from "@/interfaces/SystemTypes";
import { systemEventList, webhookChannelList, webhookEventStatusList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";
import type { ITeam } from "./Team";
import type { IUser } from "./User";

/**
 * --------- DATA REFERENCES ---------
 */
export interface IDataReferences extends Pick<IBase, "project" | "workspace" | "owner"> {
	/**
	 * Refferenced build
	 */
	build?: string | ObjectId;
	/**
	 * Refferenced release
	 */
	release?: string | ObjectId;
	/**
	 * Refferenced app
	 */
	app?: string | ObjectId;
	/**
	 * Refferenced database
	 */
	database?: string | ObjectId;
	/**
	 * Refferenced database backup
	 */
	databaseBackup?: string | ObjectId;
	/**
	 * Refferenced git provider
	 */
	gitProvider?: string | ObjectId;
	/**
	 * Refferenced cluster
	 */
	cluster?: string | ObjectId;
	/**
	 * Refferenced container registry
	 */
	registry?: string | ObjectId;
	/**
	 * Refferenced framework
	 */
	framework?: string | ObjectId;
	/**
	 * Refferenced team
	 */
	team?: string | ObjectId;
}

/**
 * An interface that extends IBase and describes the properties of an webhook.
 *
 * @interface IWebhook
 * @extends {IBase}
 */
export interface IWebhook extends IBase, IDataReferences {
	/**
	 * The name of the webhook.
	 *
	 * @type {string}
	 * @memberof IWebhook
	 */
	name?: string;

	/**
	 * A event status associated with the webhook.
	 *
	 * @type {WebhookEventStatus}
	 * @memberof IWebhook
	 */
	status?: WebhookEventStatus;

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
	events?: SystemEvent[];

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

export const webhookSchema = new Schema<IWebhook>(
	{
		...baseSchemaDefinitions,
		name: String,
		status: { type: String, enum: webhookEventStatusList },
		events: [{ type: String, enum: systemEventList }],
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
		// references
		build: { type: Schema.Types.ObjectId, ref: "builds" },
		release: { type: Schema.Types.ObjectId, ref: "releases" },
		app: { type: Schema.Types.ObjectId, ref: "apps" },
		database: { type: Schema.Types.ObjectId, ref: "databases" },
		databaseBackup: { type: Schema.Types.ObjectId, ref: "cloud_database_backups" },
		gitProvider: { type: Schema.Types.ObjectId, ref: "git_providers" },
		cluster: { type: Schema.Types.ObjectId, ref: "clusters" },
		registry: { type: Schema.Types.ObjectId, ref: "container_registries" },
		framework: { type: Schema.Types.ObjectId, ref: "frameworks" },
		team: { type: Schema.Types.ObjectId, ref: "teams" },
	},
	{ collection: "webhooks", timestamps: true }
);

export const WebhookModel = model<IWebhook>("Webhook", webhookSchema, "webhooks");
