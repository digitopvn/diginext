import { model, Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export /**
 * An interface that extends IBase and describes the properties of an activity.
 *
 * @interface IActivity
 * @extends {IBase}
 */
interface IActivity extends IBase {
	/**
	 * The name of the activity.
	 *
	 * @type {string}
	 * @memberof IActivity
	 */
	name?: string;

	/**
	 * A message associated with the activity.
	 *
	 * @type {string}
	 * @memberof IActivity
	 */
	message?: string;

	/**
	 * The URL of the activity.
	 *
	 * @type {string}
	 * @memberof IActivity
	 */
	url?: string;

	/**
	 * The route of the activity.
	 *
	 * @type {string}
	 * @memberof IActivity
	 */
	route?: string;

	/**
	 * The name of the route of the activity.
	 *
	 * @type {string}
	 * @memberof IActivity
	 */
	routeName?: string;

	/**
	 * The HTTP method used for the activity.
	 *
	 * @type {string}
	 * @memberof IActivity
	 */
	method?: string;

	/**
	 * The query parameters of the activity.
	 *
	 * @type {*}
	 * @memberof IActivity
	 */
	query?: any;

	/**
	 * The HTTP status code returned from the activity.
	 *
	 * @type {*}
	 * @memberof IActivity
	 */
	httpStatus?: any;

	/**
	 * The response message returned from the activity.
	 *
	 * @type {string}
	 * @memberof IActivity
	 */
	response?: string;

	/**
	 * The response status code returned from the activity.
	 *
	 * @type {number}
	 * @memberof IActivity
	 */
	responseStatus?: number;
}

export type ActivityDto = Omit<IActivity, keyof HiddenBodyKeys>;

export const activitySchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: String,
		message: String,
		url: String,
		route: String,
		routeName: String,
		method: String,
		query: Schema.Types.Mixed,
		httpStatus: Schema.Types.Mixed,
		response: String,
		responseStatus: Number,
	},
	{ collection: "activities", timestamps: true }
);

export const ActivityModel = model<IActivity>("Activity", activitySchema, "activities");
