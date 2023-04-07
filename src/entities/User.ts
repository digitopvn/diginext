import { IsEmail, IsNotEmpty } from "class-validator";
import type { ObjectId } from "mongodb";

import type { HiddenBodyKeys } from "@/interfaces";
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

export interface AccessTokenInfo {
	access_token: string;
	expiredTimestamp: number;
	expiredDate: Date;
	expiredDateGTM7: string;
}

export type UserDto = Omit<User, keyof HiddenBodyKeys>;

@Entity({ name: "users" })
export default class User extends Base {
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
	 * Service Account is also a User with unexpired access token.
	 */
	@Column({ default: "user" })
	type?: string;

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
	token?: AccessTokenInfo;

	/**
	 * User's roles (should be filtered by "workspace")
	 */
	@ObjectIdColumn({ name: "roles", array: true, default: [] })
	roles?: (ObjectID | ObjectId | Role | string)[];

	/**
	 * User's team IDs which this user is a member
	 */
	@ObjectIdColumn({ name: "teams", array: true, default: [] })
	teams?: (ObjectID | ObjectId | Team | string)[];

	/**
	 * List of workspace IDs which this user is a member
	 */
	@ObjectIdColumn({ name: "workspaces", array: true, default: [] })
	workspaces?: (ObjectID | ObjectId | Workspace | string)[];

	/**
	 * Active workspace of a user
	 */
	@ObjectIdColumn({ name: "workspaces" })
	activeWorkspace?: ObjectID | ObjectId | Workspace | string;

	/**
	 * User ID of the user who invited this user
	 *
	 * @remarks This can be populated to {User} data
	 */
	@ObjectIdColumn({ name: "users" })
	owner?: ObjectId | ObjectID | User | string;

	constructor(data?: User) {
		super();
		Object.assign(this, data);
	}
}

export { User };
