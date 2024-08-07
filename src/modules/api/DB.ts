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
	ICloudStorage,
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
import type { IQueryFilter, IQueryOptions, IQueryPagination, KubeNamespace } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";

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
	"storage",
	"monitor/namespaces",
] as const;
export type DBCollection = (typeof dbCollections)[number];

export function queryFilterToUrlFilter(filter: any = {}) {
	return new URLSearchParams(filter).toString();
}

export function queryOptionsToUrlOptions(options: IQueryOptions & IQueryPagination = {}) {
	let optionsStr = "";

	const {
		$or,
		order,
		populate,
		select,
		total,
		total_items,
		total_pages,
		current_page,
		page_size,
		next_page,
		prev_page,
		filter,
		func,
		ignorable,
		...rest
	} = options;

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
	: T extends "storage"
	? ICloudStorage
	: T extends "monitor/namespaces"
	? KubeNamespace
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
	ownership?: Ownership;
}

export class DB {
	static async getService(collection: DBCollection, ownership?: Ownership) {
		let svc;
		switch (collection) {
			case "app":
				const { AppService } = await import("@/services");
				svc = new AppService();
				break;
			case "build":
				const { BuildService } = await import("@/services");
				svc = new BuildService();
				break;
			case "database":
				const { CloudDatabaseService } = await import("@/services");
				svc = new CloudDatabaseService();
				break;
			case "db_backup":
				const { CloudDatabaseBackupService } = await import("@/services");
				svc = new CloudDatabaseBackupService();
				break;
			case "provider":
				const { CloudProviderService } = await import("@/services");
				svc = new CloudProviderService();
				break;
			case "cronjob":
				const { CronjobService } = await import("@/services");
				svc = new CronjobService();
				break;
			case "cluster":
				const { ClusterService } = await import("@/services");
				svc = new ClusterService();
				break;
			case "registry":
				const { ContainerRegistryService } = await import("@/services");
				svc = new ContainerRegistryService();
				break;
			case "framework":
				const { FrameworkService } = await import("@/services");
				svc = new FrameworkService();
				break;
			case "git":
			case "git_repo":
				const { GitProviderService } = await import("@/services");
				svc = new GitProviderService();
				break;
			case "project":
				const { ProjectService } = await import("@/services");
				svc = new ProjectService();
				break;
			case "release":
				const { ReleaseService } = await import("@/services");
				svc = new ReleaseService();
				break;
			case "role":
				const { RoleService } = await import("@/services");
				svc = new RoleService();
				break;
			case "route":
				const { RouteService } = await import("@/services");
				svc = new RouteService();
				break;
			case "team":
				const { TeamService } = await import("@/services");
				svc = new TeamService();
				break;
			case "user":
				const { UserService } = await import("@/services");
				svc = new UserService();
				break;
			case "api_key_user":
				const { ApiKeyUserService } = await import("@/services");
				svc = new ApiKeyUserService();
				break;
			case "service_account":
				const { ServiceAccountService } = await import("@/services");
				svc = new ServiceAccountService();
				break;
			case "workspace":
				const { WorkspaceService } = await import("@/services");
				svc = new WorkspaceService();
				break;
			case "webhook":
				const { WebhookService } = await import("@/services");
				svc = new WebhookService();
				break;
			case "notification":
				const { NotificationService } = await import("@/services");
				svc = new NotificationService();
				break;
			case "storage":
				const { CloudStorageService } = await import("@/services");
				svc = new CloudStorageService();
				break;
			case "monitor/namespaces":
				const { MonitorNamespaceService } = await import("@/services");
				svc = new MonitorNamespaceService();
				break;
		}
		// assign ownership
		if (svc) svc.ownership = ownership;
		return svc;
	}

	static async count<T = any>(collection: DBCollection, filter: IQueryFilter<T> = {}, options?: DBQueryOptions, pagination?: IQueryPagination) {
		let amount: number;
		if (isServerMode) {
			const svc = await DB.getService(collection, options?.ownership);
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
			delete options.ownership;

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
			const svc = await DB.getService(collection, options?.ownership);
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
			delete options.ownership;

			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);

			// special case
			const path = collection === "git_repo" ? "git" : collection;
			const url = `/api/v1/${path}${subpath}?${filterStr}${optionStr === "&" ? "" : optionStr}`;

			const { data = [], status, messages = [""] } = await fetchApi<T>({ url, isDebugging: options.isDebugging });
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
			const svc = await DB.getService(collection, options?.ownership);
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
			delete options.ownership;

			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			// special case
			const path = collection === "git_repo" ? "git" : collection;
			const url = `/api/v1/${path}${subpath}?${filterStr}${optionStr === "&" ? "" : optionStr}`;

			const res = await fetchApi<T>({ url });
			if (options?.isDebugging) console.log("[DB] FIND ONE > " + url + " > response :>> ", res);
			const { data = [], status, messages = [""] } = res;
			if (!status && messages[0] && !options?.ignorable) logError(`[DB] FIND ONE - ${url} :>>`, messages);
			item = isArray(data) ? data[0] : data;
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
			const svc = await DB.getService(collection, options?.ownership);
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
			delete options.ownership;

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
			const svc = await DB.getService(collection, options?.ownership);
			if (!svc) {
				if (!options?.ignorable) logError(`[DB] UPDATE > Service "${collection}" :>> Service not found.`);
				return;
			}
			svc.ownership = options.ownership;

			if (options.isDebugging) console.log("[DB] data :>> ", data);
			if (options.isDebugging) console.log("[DB] options :>> ", options);
			try {
				items = (await svc.update(filter, data, options)) || [];
			} catch (e) {
				if (!options?.ignorable) logError(`[DB] UPDATE > Service "${collection}" :>>`, e.stack);
				items = [];
			}
			if (options.isDebugging) console.log("[DB] items :>> ", items);
		} else {
			const { subpath = "" } = options;
			delete options.subpath;
			delete options.ownership;

			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			// special case
			const path = collection === "git_repo" ? "git" : collection;
			const url = `/api/v1/${path}${subpath}?${filterStr}${optionStr === "&" ? "" : optionStr}`;
			const updateData = data;
			if (options.isDebugging) console.log(`[DB] UPDATE > ${url} > updateData :>> `, updateData);

			const {
				status,
				data: result = [],
				messages = [""],
			} = await fetchApi({
				url,
				method: "PATCH",
				data: updateData,
			});

			if (options.isDebugging) console.log("[DB] UPDATE > " + url + " > result :>> ", status, "-", result, "-", messages);
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
			const svc = await DB.getService(collection, options?.ownership);
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
			delete options.subpath;
			delete options.ownership;

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
