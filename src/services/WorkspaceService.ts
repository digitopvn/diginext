import type { Types } from "mongoose";

import { Config, IsTest } from "@/app.config";
import type { IRole } from "@/entities";
import type { IWorkspace } from "@/entities/Workspace";
import { workspaceSchema } from "@/entities/Workspace";
import type { IQueryFilter, IQueryOptions } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import { dxSendEmail } from "@/modules/diginext/dx-email";
import { dxCreateUser } from "@/modules/diginext/dx-user";
import type { CreateWorkspaceParams } from "@/modules/diginext/dx-workspace";
import { dxCreateWorkspace, dxJoinWorkspace } from "@/modules/diginext/dx-workspace";
import { filterUniqueItems } from "@/plugins/array";
import { MongoDB } from "@/plugins/mongodb";
import { addUserToWorkspace, makeWorkspaceActive } from "@/plugins/user-utils";
import seedWorkspaceInitialData from "@/seeds";

import BaseService from "./BaseService";
import { RoleService } from "./RoleService";
import { UserService } from "./UserService";

export interface WorkspaceInputData {
	/**
	 * Name of the workspace.
	 */
	name: string;
	/**
	 * User ID of the owner (default is the current authenticated user)
	 */
	owner?: string;
	/**
	 * Set privacy mode for this workspace
	 * @default true
	 */
	public?: boolean;
	/**
	 * DXUP API Key
	 */
	dx_key?: string;
	/**
	 * DXUP Workspace ID
	 */
	dx_id?: string;
}

export interface InviteMemberData {
	emails: string[];
	role?: string;
}

export interface AddUserToWorkspaceParams {
	userId: Types.ObjectId;
	workspaceId: Types.ObjectId;
	roleId?: Types.ObjectId;
}

export class WorkspaceService extends BaseService<IWorkspace> {
	constructor(ownership?: Ownership) {
		super(workspaceSchema, ownership);
	}

	async create(data: WorkspaceInputData, options?: IQueryOptions): Promise<IWorkspace> {
		const { owner = MongoDB.toString(this.user._id), name } = data;

		if (!name) throw new Error(`Param "name" is required.`);
		if (!owner) throw new Error(`Param "owner" (UserID) is required.`);

		// find owner
		let ownerUser = this.user;
		if (!ownerUser) throw new Error("Workspace's owner not found.");

		// Assign some default values if it's missing
		if (typeof data.public === "undefined") data.public = true;

		// ----- VERIFY DX KEY -----

		// Create a workspace in "dxup.dev"
		if (!IsTest()) {
			if (!ownerUser.dxUserId) {
				// create user on "dxup.dev" via "dxApi"
				try {
					const dxUserRes = await dxCreateUser({
						name: ownerUser.name,
						username: ownerUser.username,
						email: ownerUser.email,
						password: ownerUser.password,
						isActive: true,
					});
					if (!dxUserRes.status) throw new Error(dxUserRes.messages.join("\n"));

					const userSvc = new UserService(this.ownership);
					ownerUser = await userSvc.updateOne({ _id: ownerUser._id }, { dxUserId: dxUserRes.data.id });
				} catch (e) {
					console.log(`[WorkspaceService] create > dxCreateUser :>>`, e);
				}
			}

			// create workspace on "dxup.dev" via "dxApi"
			try {
				const dataCreateWorkSpace: CreateWorkspaceParams = {
					name: name,
					public: data.public,
					userId: ownerUser.dxUserId,
				};
				const createWsRes = await dxCreateWorkspace(dataCreateWorkSpace);
				if (!createWsRes.status) throw new Error(createWsRes.messages.join("."));

				// assign DXSITE workspace ID and key to the workspace
				data.dx_key = createWsRes.data.subscriptionKey;
				data.dx_id = createWsRes.data.id;
			} catch (e) {
				console.log(`[WorkspaceService] create > dxCreateWorkspace :>>`, e);
			}
		}
		// console.log("Config.SERVER_TYPE :>> ", Config.SERVER_TYPE);

		// ----- END VERIFYING -----

		// [1] Create new workspace:
		if (options?.isDebugging) console.log("WorkspaceService > CREATE > data :>> ", data);
		const newWorkspace = await super.create(data, options);
		if (options?.isDebugging) console.log("WorkspaceService > CREATE > ownerUser :>> ", ownerUser);
		if (options?.isDebugging) console.log("WorkspaceService > CREATE > newWorkspace :>> ", newWorkspace);
		if (!newWorkspace) throw new Error(`Failed to create new workspace.`);

		/**
		 * [2] SEED INITIAL DATA TO THIS WORKSPACE
		 * - Default roles
		 * - Default permissions of routes
		 * - Default API_KEY
		 * - Default Service Account
		 * - Default Frameworks
		 * - Default Clusters (if any)
		 */
		await seedWorkspaceInitialData(newWorkspace, ownerUser);

		// [3] Ownership: add this workspace to the creator {User} if it's not existed:
		ownerUser = await addUserToWorkspace(owner, newWorkspace, "admin");

		// [4] Set this workspace as "activeWorkspace" for this creator:
		ownerUser = await makeWorkspaceActive(owner, MongoDB.toString(newWorkspace._id));

		return newWorkspace;
	}

	async update(filter: IQueryFilter<IWorkspace>, data: any, options?: IQueryOptions): Promise<IWorkspace[]> {
		const updatedWorkspace = await super.update(filter, data, options);
		if (!updatedWorkspace) throw new Error(`Failed to update workspace.`);
		return updatedWorkspace;
	}

	async delete(filter?: IQueryFilter<IWorkspace>, options?: IQueryOptions): Promise<{ ok: boolean; affected: number }> {
		const { DB } = await import("@/modules/api/DB");

		// delete workspace in user:
		const _user = await DB.findOne("user", { workspaces: this.workspace._id });
		const workspaces = _user.workspaces.filter((wsId) => MongoDB.toString(wsId) !== MongoDB.toString(this.workspace._id));
		const updatedUser = await DB.updateOne("user", { _id: _user._id }, { workspaces, activeWorkspace: undefined });
		console.log("[WorkspaceService] delete > updatedUser :>> ", updatedUser);

		// delete related data:
		await DB.delete("project", { workspace: this.workspace._id });
		await DB.delete("app", { workspace: this.workspace._id });
		await DB.delete("build", { workspace: this.workspace._id });
		await DB.delete("cluster", { workspace: this.workspace._id });
		await DB.delete("framework", { workspace: this.workspace._id });
		await DB.delete("git", { workspace: this.workspace._id });
		await DB.delete("database", { workspace: this.workspace._id });
		await DB.delete("api_key_user", { workspace: this.workspace._id });
		await DB.delete("service_account", { workspace: this.workspace._id });
		await DB.delete("registry", { workspace: this.workspace._id });
		await DB.delete("release", { workspace: this.workspace._id });
		await DB.delete("role", { workspace: this.workspace._id });
		await DB.delete("route", { workspace: this.workspace._id });
		await DB.delete("team", { workspace: this.workspace._id });

		const deletedWorkspace = await super.delete(filter, options);
		return deletedWorkspace;
	}

	async inviteMember(data: InviteMemberData, options?: IQueryOptions): Promise<IWorkspace> {
		if (!data.emails || data.emails.length === 0) throw new Error(`List of email is required.`);
		if (!this.user) throw new Error(`Unauthenticated.`);

		const { DB } = await import("@/modules/api/DB");
		const userSvc = new UserService();
		const WcSvc = new WorkspaceService();

		const { emails, role: roleType = "member" } = data;

		const workspace = this.user.activeWorkspace as IWorkspace;
		const wsId = workspace._id;
		console.log(`[WS_Controller] Invite Member > Workspace :>>`, workspace);
		const userId = this.user._id;

		// check if this user is admin of the workspace:
		const activeRole = this.user.activeRole as IRole;
		if (activeRole.type !== "admin" && activeRole.type !== "moderator")
			throw new Error(`You don't have permissions to invite users, please contact administrator.`);

		const assignedRole = await DB.findOne("role", { type: roleType, workspace: wsId });
		// console.log("assignedRole :>> ", assignedRole);

		// create temporary users of invited members:
		const invitedMembers = await Promise.all(
			emails.map(async (email) => {
				let existingUser = await DB.findOne("user", { email });
				if (!existingUser) {
					const username = email.split("@")[0] || "New User";
					const invitedMember = await userSvc.create({
						active: false,
						name: username,
						email: email,
						workspaces: [wsId],
						roles: [assignedRole._id],
					});
					return invitedMember;
				} else {
					// Set user to workspace in Dx site
					const joinWorkspaceRes = await dxJoinWorkspace(email, workspace.slug, workspace.dx_key);

					// FIXME: check API error

					const workspaces = existingUser.workspaces || [];
					workspaces.push(wsId);
					existingUser = await DB.updateOne("user", { _id: existingUser._id }, { workspaces: filterUniqueItems(workspaces) });

					return existingUser;
				}
			})
		);

		// send invitation emails to those users:
		if (!IsTest()) {
			const mailContent = `Dear,<br/><br/>You've been invited to <strong>"${workspace.name}"</strong> workspace, please <a href="${Config.BASE_URL}" target="_blank">click here</a> to login.<br/><br/>Cheers,<br/>Diginext System`;

			// send invitation email to those users:
			const result = await dxSendEmail(
				{
					recipients: invitedMembers.map((member) => {
						return { email: member.email };
					}),
					subject: `[DXUP] "${this.user.name}" has invited you to join "${workspace.name}" workspace.`,
					content: mailContent,
				},
				workspace.dx_key
			);
		}

		return workspace;
	}

	async addUser(data: AddUserToWorkspaceParams) {
		const { userId, workspaceId, roleId } = data;
		const uid = userId;
		const wsId = workspaceId;
		const userSvc = new UserService(this.ownership);
		const roleSvc = new RoleService(this.ownership);

		const user = await userSvc.findOne({ id: uid });
		const workspace = await this.findOne({ id: wsId });

		let role: IRole;
		if (roleId) role = await roleSvc.findOne({ id: roleId });

		if (!user) throw new Error(`This user is not existed.`);
		if (!workspace) throw new Error(`This workspace is not existed.`);
		if (user.workspaces.includes(wsId)) throw new Error(`This user is existed in this workspace.`);

		const workspaces = [...user.workspaces, wsId].filter((_wsId) => typeof _wsId !== "undefined").map((_wsId) => MongoDB.toString(_wsId));

		const updatedUser = await userSvc.update({ id: uid }, { workspaces });

		return workspace;
	}
}
