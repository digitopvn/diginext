import type { HiddenBodyKeys } from "@/interfaces";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import Base from "./Base";
import type User from "./User";
import Workspace from "./Workspace";

export type ActivityDto = Omit<Activity, keyof HiddenBodyKeys>;

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
	owner?: ObjectID | User | string;

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
