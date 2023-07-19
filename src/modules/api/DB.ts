import { logError } from "diginext-utils/dist/xconsole/log";
import { isArray, isEmpty } from "lodash";
import type { UpdateQuery, UpdateWithAggregationPipeline } from "mongoose";

import { isServerMode } from "@/app.config";
import type {
	IApiKeyAccount,
	IApp,
	IBuild,
	ICloudDatabase,
	ICloudDatabaseBackup,
	ICloudProvider,
	ICluster,
	IContainerRegistry,
	ICronjob,
	IFramework,
	IGitProvider,
	INotification,
	IProject,
	IRelease,
	IRole,
	IRoute,
	IServiceAccount,
	ITeam,
	IUser,
	IWebhook,
	IWorkspace,
} from "@/entities";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";
import {
	ApiKeyUserService,
	AppService,
	BuildService,
	CloudDatabaseBackupService,
	CloudDatabaseService,
	CloudProviderService,
	ClusterService,
	ContainerRegistryService,
	CronjobService,
	FrameworkService,
	GitProviderService,
	NotificationService,
	ProjectService,
	ReleaseService,
	RoleService,
	RouteService,
	ServiceAccountService,
	TeamService,
	UserService,
	WebhookService,
	WorkspaceService,
} from "@/services";

import type { GitRepository } from "../git/git-provider-api";
import fetchApi from "./fetchApi";

export const dbCollections = [
	"app",
	"build",
	"database",
	"db_backup",
	"provider",
	"cluster",
	"git",
	"git_repo",
	"registry",
	"framework",
	"project",
	"release",
	"role",
	"route",
	"team",
	"user",
	"api_key_user",
	"service_account",
	"workspace",
	"cronjob",
	"webhook",
	"notification",
] as const;
export type DBCollection = typeof dbCollections[number];

export function queryFilterToUrlFilter(filter: any = {}) {
	return new URLSearchParams(filter).toString();
}

export function queryOptionsToUrlOptions(options: IQueryOptions & IQueryPagination = {}) {
	let optionsStr = "";

	const { $or, order, populate, select, total, total_items, total_pages, current_page, page_size, next_page, prev_page, filter, func, ...rest } =
		options;

	if (!isEmpty(order)) {
		const orderStr = Object.entries(options.order)
			.map(([key, val]) => {
				return val === 1 ? key : `-${key}`;
			})
			.join(",");
		optionsStr += "sort=" + orderStr;
	}

	if (!isEmpty(populate)) {
		const populateStr = options.populate.join(",");
		optionsStr += (optionsStr && "&") + "populate=" + populateStr;
	}

	if (!isEmpty(select)) {
		const selectStr = options.select.join(",");
		optionsStr += (optionsStr && "&") + "select=" + selectStr;
	}

	if (!isEmpty(rest)) optionsStr += (optionsStr && "&") + new URLSearchParams(rest).toString();

	if (!isEmpty($or)) {
		optionsStr += (optionsStr && "&") + "or=" + JSON.stringify($or);
	}

	return optionsStr;
}

const app = new AppService();
const build = new BuildService();
const database = new CloudDatabaseService();
const db_backup = new CloudDatabaseBackupService();
const provider = new CloudProviderService();
const cluster = new ClusterService();
const registry = new ContainerRegistryService();
const framework = new FrameworkService();
const git = new GitProviderService();
const project = new ProjectService();
const release = new ReleaseService();
const role = new RoleService();
const route = new RouteService();
const team = new TeamService();
const user = new UserService();
const api_key_user = new ApiKeyUserService();
const service_account = new ServiceAccountService();
const workspace = new WorkspaceService();
const cronjob = new CronjobService();
const webhook = new WebhookService();
const notification = new NotificationService();

export type TypeByCollection<T extends DBCollection> = T extends "api_key_user"
	? IApiKeyAccount
	: T extends "app"
	? IApp
	: T extends "build"
	? IBuild
	: T extends "cluster"
	? ICluster
	: T extends "cronjob"
	? ICronjob
	: T extends "database"
	? ICloudDatabase
	: T extends "db_backup"
	? ICloudDatabaseBackup
	: T extends "framework"
	? IFramework
	: T extends "git"
	? IGitProvider
	: T extends "git_repo"
	? GitRepository
	: T extends "project"
	? IProject
	: T extends "provider"
	? ICloudProvider
	: T extends "registry"
	? IContainerRegistry
	: T extends "release"
	? IRelease
	: T extends "role"
	? IRole
	: T extends "route"
	? IRoute
	: T extends "service_account"
	? IServiceAccount
	: T extends "team"
	? ITeam
	: T extends "user"
	? IUser
	: T extends "workspace"
	? IWorkspace
	: T extends "webhook"
	? IWebhook
	: T extends "notification"
	? INotification
	: never;

export interface DBQueryOptions extends IQueryOptions {
	filter?: any;

	/**
	 * Subpath of the API
	 */
	subpath?: string;

	/**
	 * Similar to "subpath" but for service -> function name:
	 */
	func?: any;

	/**
	 * Debug
	 * @default false
	 */
	isDebugging?: boolean;

	/**
	 * If `true`, won't throw any errors
	 * @default false
	 */
	ignorable?: boolean;

	user?: IUser;
	workspace?: IWorkspace;
}

export class DB {
	static service = {
		app,
		build,
		database,
		db_backup,
		provider,
		cronjob,
		cluster,
		registry,
		framework,
		git,
		git_repo: git,
		project,
		release,
		role,
		route,
		team,
		user,
		api_key_user,
		service_account,
		workspace,
		webhook,
		notification,
	};

	static async count<T = any>(collection: DBCollection, filter: IQueryFilter<T> = {}, options?: DBQueryOptions, pagination?: IQueryPagination) {
		let amount: number;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				if (!options?.ignorable) logError(`[DB] COUNT :>> Service "${collection}" not found.`);
				return;
			}
			try {
				amount = (await svc.count(filter)) || 0;
			} catch (e) {
				if (!options?.ignorable) logError(`[DB] COUNT > Service "${collection}" :>>`, e);
			}
		} else {
			// extract "subpath", then delete it from "options"
			const { subpath = "" } = options;
			delete options.subpath;
			delete options.filter;

			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			// special case
			const path = collection === "git_repo" ? "git" : collection;
			const url = `/api/v1/${path}${subpath}?${filterStr}${optionStr === "&" ? "" : optionStr}`;

			const { data = [], status, messages = [""] } = await fetchApi({ url });
			if (!status && messages[0] && !options?.ignorable) logError(`[DB] COUNT - ${url} :>>`, messages);

			amount = data;
		}
		return amount;
	}

	static async find<I extends any, T extends DBCollection>(
		collection: T,
		filter: IQueryFilter<TypeByCollection<T>> = {},
		options: IQueryOptions = {},
		pagination?: IQueryPagination
	): Promise<TypeByCollection<T>[]> {
		let items;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				if (!options?.ignorable) logError(`[DB] FIND :>> Service "${collection}" not found.`);
				return [];
			}
			try {
				items = (await svc.find(filter, options, pagination)) || ([] as any[]);
			} catch (e) {
				if (!options?.ignorable) logError(`[DB] FIND > Service "${collection}" :>>`, e);
				items = [];
			}
		} else {
			// extract "subpath", then delete it from "options"
			const { subpath = "" } = options;
			delete options.subpath;
			delete options.filter;

			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);

			// special case
			const path = collection === "git_repo" ? "git" : collection;
			const url = `/api/v1/${path}${subpath}?${filterStr}${optionStr === "&" ? "" : optionStr}`;

			const { data = [], status, messages = [""] } = await fetchApi<T>({ url });
			if (!status && messages[0] && !options?.ignorable) logError(`[DB] FIND MANY - ${url} :>>`, messages);

			items = data;
		}
		return items as TypeByCollection<T>[];
	}

	static async findOne<T extends DBCollection>(
		collection: T,
		filter: IQueryFilter<TypeByCollection<T>> = {},
		options: DBQueryOptions = {}
	): Promise<TypeByCollection<T>> {
		// extract "subpath", then delete it from "options"
		const { subpath = "", func } = options;
		delete options.subpath;
		delete options.filter;
		delete options.func;

		let item;

		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				if (!options?.ignorable) logError(`[DB] FIND ONE > Service "${collection}" not found.`);
				return;
			}
			try {
				item = await svc.findOne(filter, options);
			} catch (e) {
				if (!options?.ignorable) logError(`[DB] FIND ONE > Service "${collection}" :>>`, e);
			}
		} else {
			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			// special case
			const path = collection === "git_repo" ? "git" : collection;
			const url = `/api/v1/${path}${subpath}?${filterStr}${optionStr === "&" ? "" : optionStr}`;

			const res = await fetchApi<T>({ url });
			const { data = [], status, messages = [""] } = res;
			if (!status && messages[0] && !options?.ignorable) logError(`[DB] FIND ONE - ${url} :>>`, messages);
			item = data[0];
		}
		return item;
	}

	static async create<T extends DBCollection>(collection: T, data: any, options: DBQueryOptions = {}): Promise<TypeByCollection<T>> {
		const { subpath = "", filter, func } = options;
		delete options.subpath;
		delete options.filter;
		delete options.func;

		let item;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				if (!options?.ignorable) logError(`[DB] CREATE :>> Service "${collection}" not found.`);
				return;
			}
			// if (func) {
			// 	return svc[func]();
			// }
			try {
				item = await svc.create(data);
			} catch (e) {
				if (!options?.ignorable) logError(`[DB] CREATE > Service "${collection}" :>>`, e);
			}
		} else {
			let newData = data;

			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			// special case
			const path = collection === "git_repo" ? "git" : collection;
			const url = `/api/v1/${path}${subpath}?${filterStr}${optionStr === "&" ? "" : optionStr}`;
			if (options?.isDebugging) console.log(`[CLI] DB > CREATE > ${url} :>>`, newData);
			// console.log("newData :>> ", newData);

			const {
				data: result,
				status,
				messages = [""],
			} = await fetchApi<T>({
				url,
				method: "POST",
				data: newData,
			});
			if (!status && messages[0] && !options?.ignorable) logError(`[DB] CREATE - ${url} :>>`, messages);
			item = result;
		}
		return item;
	}

	static async update<T extends DBCollection>(
		collection: T,
		filter: IQueryFilter<TypeByCollection<T>>,
		data: UpdateQuery<TypeByCollection<T>> | UpdateWithAggregationPipeline,
		options: DBQueryOptions = {}
	): Promise<TypeByCollection<T>[]> {
		let items;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				if (!options?.ignorable) logError(`[DB] UPDATE > Service "${collection}" :>> Service not found.`);
				return;
			}

			try {
				items = (await svc.update(filter, data, options)) || [];
			} catch (e) {
				if (!options?.ignorable) logError(`[DB] UPDATE > Service "${collection}" :>>`, e);
				items = [];
			}
		} else {
			const { subpath = "" } = options;
			delete options.subpath;

			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			// special case
			const path = collection === "git_repo" ? "git" : collection;
			const url = `/api/v1/${path}${subpath}?${filterStr}${optionStr === "&" ? "" : optionStr}`;
			// console.log("[DB] UPDATE > url :>> ", url);

			// const updateData = flattenObjectPaths(data);
			const updateData = data;
			// console.log("[DB] UPDATE > updateData :>> ", updateData);
			// console.dir(updateData, { depth: 10 });

			const {
				status,
				data: result = [],
				messages = [""],
			} = await fetchApi({
				url,
				method: "PATCH",
				data: updateData,
			});

			if (options.isDebugging) console.log("[DB] UPDATE > result :>> ", status, "-", result, "-", messages);
			if (!status && messages[0] && !options?.ignorable) logError(`[DB] UPDATE - ${url} :>>`, messages);

			items = isArray(result) ? result : [result];
		}
		return items;
	}

	static async updateOne<T extends DBCollection>(
		collection: T,
		filter: IQueryFilter<TypeByCollection<T>>,
		data: UpdateQuery<TypeByCollection<T>> | UpdateWithAggregationPipeline,
		options: DBQueryOptions = {}
	): Promise<TypeByCollection<T>> {
		let items = await this.update(collection, filter, data, options);
		if (!items || items.length === 0) return;
		return items[0];
	}

	static async delete<I = any>(collection: DBCollection, filter: IQueryFilter<I>, data: any = {}, options: DBQueryOptions = {}) {
		let item: { ok: boolean; affected: number };
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				if (!options?.ignorable) logError(`[DB] DELETE > Service "${collection}" :>> Service not found.`);
				return;
			}
			try {
				item = await svc.softDelete(filter);
			} catch (e) {
				if (!options?.ignorable) logError(`[DB] DELETE > Service "${collection}" :>>`, e);
			}
		} else {
			const { subpath = "" } = options;
			const filterStr = queryFilterToUrlFilter(filter);
			// special case
			const path = collection === "git_repo" ? "git" : collection;
			const url = `/api/v1/${path}${subpath}?${filterStr}`;
			const {
				data: result,
				status,
				messages = [""],
			} = await fetchApi({
				method: "DELETE",
				url,
				data,
			});
			if (!status && messages[0] && !options?.ignorable) logError(`[DB] DELETE - ${url} :>>`, messages);
			item = result as { ok: boolean; affected: number };
		}
		return item;
	}
}
