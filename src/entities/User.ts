import { IsEmail, IsNotEmpty } from "class-validator";

import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import Base from "./Base";
import type { Role } from "./Role";
import type { Team } from "./Team";
import type { Workspace } from "./Workspace";

export interface ProviderInfo {
	name: string;
	user_id?: string;
	access_token?: string;
}

@Entity({ name: "users" })
export default class User extends Base<User> {
	/**
	 * User name
	 */
	@Column({ length: 250 })
	@IsNotEmpty({ message: `User name is required.` })
	name?: string;

	/**
	 * Unique username of a user
	 * This equavilent with "slug"
	 */
	@Column()
	username?: string;

	/**
	 * User email address
	 */
	@Column({ length: 500 })
	@IsNotEmpty({ message: `Email is required.` })
	@IsEmail(null, { message: `Email is not valid.` })
	email?: string;

	/**
	 * Is this user's email or phone verified?
	 */
	@Column("boolean", { default: false })
	verified?: boolean;

	/**
	 * User profile picture URL
	 */
	@Column({ type: "string" })
	image?: string;

	/**
	 * List of Cloud Providers which this user can access to
	 */
	@Column({ array: true })
	providers?: ProviderInfo[];

	/**
	 * User password (hashed)
	 */
	@Column({ type: "string" })
	password?: string;

	/**
	 * User token
	 */
	@Column()
	token?: any;

	/**
	 * User's roles
	 */
	@ObjectIdColumn({ name: "roles", array: true, default: [] })
	roles?: ObjectID[] | Role[] | string[];

	/**
	 * User's team IDs which this user is a member
	 */
	@ObjectIdColumn({ name: "teams", array: true, default: [] })
	teams?: ObjectID[] | Team[] | string[];

	/**
	 * List of workspace IDs which this user is a member
	 */
	@ObjectIdColumn({ name: "workspaces", array: true, default: [] })
	workspaces?: ObjectID[] | Workspace[] | string[];

	/**
	 * Active workspace of a user
	 */
	@ObjectIdColumn({ name: "workspaces" })
	activeWorkspace?: ObjectID | Workspace | string;

	constructor(data?: User) {
		super();
		Object.assign(this, data);
		// this.username = this.slug;
	}
}

export { User };
