import { IsNotEmpty } from "class-validator";
import type { Types } from "mongoose";
import { Schema } from "mongoose";

import type { ObjectID } from "@/libs/typeorm";
import { Column, Entity, ObjectIdColumn } from "@/libs/typeorm";

import type { IBase } from "./Base";
import Base, { baseSchemaOptions } from "./Base";
import type { IProject, IUser, IWorkspace, Project, User, Workspace } from "./index";
// import type { User } from "./User";
// import type { Workspace } from "./Workspace";

export interface ITeam extends IBase {
	name: string;
	image?: string;
	owner?: Types.ObjectId | IUser | string;
	project?: Types.ObjectId | IProject | string;
	workspace?: Types.ObjectId | IWorkspace;
}

export const teamSchema = new Schema({
	...baseSchemaOptions,
	name: { type: String, required: true },
	image: { type: String },
	owner: { type: Schema.Types.ObjectId, ref: "users" },
	project: { type: Schema.Types.ObjectId, ref: "projects" },
	workspace: { type: Schema.Types.ObjectId, ref: "workspaces" },
});

@Entity({ name: "teams" })
export default class Team extends Base {
	@Column({ length: 250 })
	@IsNotEmpty({ message: `Team name is required.` })
	name?: string;

	@Column()
	image?: string;

	/**
	 * User ID of the owner
	 *
	 * @remarks This can be populated to {User} data
	 */
	@ObjectIdColumn({ name: "users" })
	owner?: ObjectID | User | string;

	/**
	 * ID of the project
	 *
	 * @remarks This can be populated to {Project} data
	 */
	@ObjectIdColumn({ name: "projects" })
	project?: ObjectID | Project | string;

	/**
	 * ID of the workspace
	 *
	 * @remarks This can be populated to {Workspace} data
	 */
	@ObjectIdColumn({ name: "workspaces" })
	workspace?: ObjectID | Workspace | string;

	constructor(data?: Team) {
		super();
		Object.assign(this, data);
	}
}

export { Team };
