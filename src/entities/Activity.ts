import { model, Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";

import type { IBase } from "./Base";
import { baseSchemaOptions } from "./Base";

export interface IActivity extends IBase {
	name?: string;
	message?: string;
	url?: string;
	route?: string;
	routeName?: string;
	method?: string;
	query?: any;
	httpStatus?: any;
	response?: string;
	responseStatus?: number;
}

export type ActivityDto = Omit<IActivity, keyof HiddenBodyKeys>;

export const activitySchema = new Schema(
	{
		...baseSchemaOptions,
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
	{ collection: "activities" }
);

export const ActivityModel = model<IActivity>("Activity", activitySchema, "activities");
