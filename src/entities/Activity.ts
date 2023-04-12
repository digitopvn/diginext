import type { HiddenBodyKeys } from "@/interfaces";
import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import Base from "./Base";
import type User from "./User";
import type Workspace from "./Workspace";

export type ActivityDto = Omit<Activity, keyof HiddenBodyKeys>;

@Entity({ name: "apps" })
export default class Activity extends Base {
	@Column()
	name?: string;

	@Column()
	message?: string;

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

	/**
	 * Owner ID of the app
	 *
	 * @remarks This can be populated to {User} data
	 */
	@ObjectIdColumn({ name: "users" })
	owner?: ObjectID | User | string;

	/**
	 * Workspace ID of the app
	 *
	 * @remarks This can be populated to {Workspace} data
	 */
	@ObjectIdColumn({ name: "workspaces" })
	workspace?: ObjectID | Workspace | string;

	constructor(data?: ActivityDto) {
		super();
		Object.assign(this, data);
	}
}

export { Activity };
