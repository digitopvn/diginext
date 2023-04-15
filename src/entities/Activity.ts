import type { ObjectId } from "mongodb";
import { model, Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import type { IBase } from "./Base";
import Base, { baseSchemaOptions } from "./Base";
import type User from "./User";
import Workspace from "./Workspace";

export type ActivityDto = Omit<Activity, keyof HiddenBodyKeys>;

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

@Entity({ name: "activities" })
export default class Activity extends Base {
	@Column()
	name?: string;

	@Column()
	message?: string;

	@Column()
	url?: string;

	@Column()
	route?: string;

	@Column()
	routeName?: string;

	@Column()
	method?: string;

	@Column()
	query?: any;

	@Column()
	httpStatus?: any;

	@Column()
	response?: string;

	@Column()
	responseStatus?: number;

	/**
	 * Owner ID of the app
	 *
	 * @remarks This can be populated to {User} data
	 */
	@ObjectIdColumn({ name: "users" })
	owner?: ObjectID | ObjectId | User | string;

	/**
	 * Workspace data object
	 */
	@Column()
	workspace?: Workspace;

	constructor(data?: ActivityDto) {
		super();
		Object.assign(this, data);
	}
}

export { Activity };
