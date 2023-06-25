import { logError } from "diginext-utils/dist/xconsole/log";
import { isEmpty } from "lodash";

import { isServerMode } from "@/app.config";
import type { IQueryOptions, IQueryPagination } from "@/interfaces";
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
	ProjectService,
	ReleaseService,
	RoleService,
	RouteService,
	ServiceAccountService,
	TeamService,
	UserService,
	WorkspaceService,
} from "@/services";

import fetchApi from "./fetchApi";

export type DBCollection =
	| "app"
	| "build"
	| "database"
	| "db_backup"
	| "provider"
	| "cluster"
	| "git"
	| "registry"
	| "framework"
	| "project"
	| "release"
	| "role"
	| "route"
	| "team"
	| "user"
	| "api_key_user"
	| "service_account"
	| "workspace"
	| "cronjob";

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
		project,
		release,
		role,
		route,
		team,
		user,
		api_key_user,
		service_account,
		workspace,
	};

	static async count(collection: DBCollection, filter: any = {}, options?: DBQueryOptions, pagination?: IQueryPagination) {
		let amount: number;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] COUNT :>> Service "${collection}" not found.`);
				return;
			}
			try {
				amount = (await svc.count(filter)) || 0;
			} catch (e) {
				logError(`[DB] COUNT > Service "${collection}" :>>`, e);
			}
		} else {
			// extract "subpath", then delete it from "options"
			const { subpath = "" } = options;
			delete options.subpath;
			delete options.filter;

			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			const url = `/api/v1/${collection}${subpath}?${filterStr}${optionStr === "&" ? "" : optionStr}`;

			const { data = [], status, messages = [""] } = await fetchApi({ url });
			if (!status && messages[0]) logError(`[DB] COUNT - ${url} :>>`, messages);

			amount = data;
		}
		return amount;
	}

	static async find<T = any>(collection: DBCollection, filter: any = {}, options: IQueryOptions = {}, pagination?: IQueryPagination) {
		let items;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] FIND :>> Service "${collection}" not found.`);
				return [];
			}
			try {
				items = (await svc.find(filter, options, pagination)) || [];
			} catch (e) {
				logError(`[DB] FIND > Service "${collection}" :>>`, e);
				items = [];
			}
		} else {
			// extract "subpath", then delete it from "options"
			const { subpath = "" } = options;
			delete options.subpath;
			delete options.filter;

			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			const url = `/api/v1/${collection}${subpath}?${filterStr}${optionStr === "&" ? "" : optionStr}`;

			const { data = [], status, messages = [""] } = await fetchApi<T>({ url });
			if (!status && messages[0]) logError(`[DB] FIND MANY - ${url} :>>`, messages);

			items = data;
		}
		return items as T[];
	}

	static async findOne<T = any>(collection: DBCollection, filter: any = {}, options: DBQueryOptions = {}) {
		// extract "subpath", then delete it from "options"
		const { subpath = "", func } = options;
		delete options.subpath;
		delete options.filter;
		delete options.func;

		let item;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] FIND ONE > Service "${collection}" not found.`);
				return;
			}
			try {
				item = await svc.findOne(filter, options);
			} catch (e) {
				logError(`[DB] FIND ONE > Service "${collection}" :>>`, e);
			}
		} else {
			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			const url = `/api/v1/${collection}${subpath}?${filterStr}${optionStr === "&" ? "" : optionStr}`;

			const { data = [], status, messages = [""] } = await fetchApi<T>({ url });
			if (!status && messages[0]) logError(`[DB] FIND ONE - ${url} :>>`, messages);
			item = data[0];
		}
		return item as T;
	}

	static async create<T = any>(collection: DBCollection, data: any, options: DBQueryOptions = {}) {
		const { subpath = "", filter, func } = options;
		delete options.subpath;
		delete options.filter;
		delete options.func;

		let item: T;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] CREATE :>> Service "${collection}" not found.`);
				return;
			}
			// if (func) {
			// 	return svc[func]();
			// }
			try {
				item = (await svc.create(data)) as T;
			} catch (e) {
				logError(`[DB] CREATE > Service "${collection}" :>>`, e);
			}
		} else {
			/**
			 * ___Notes___: use the same flatten method with UPDATE for convenience!
			 */
			// let newData = flattenObjectPaths(data);
			let newData = data;

			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			const url = `/api/v1/${collection}${subpath}?${filterStr}${optionStr === "&" ? "" : optionStr}`;

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
			if (!status && messages[0]) logError(`[DB] CREATE - ${url} :>>`, messages);
			item = result as T;
		}
		return item;
	}

	static async update<T = any>(collection: DBCollection, filter: any, data: any, options: DBQueryOptions = {}) {
		let items;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] UPDATE > Service "${collection}" :>> Service not found.`);
				return;
			}

			try {
				items = (await svc.update(filter, data, options)) || [];
			} catch (e) {
				logError(`[DB] UPDATE > Service "${collection}" :>>`, e);
				items = [];
			}
		} else {
			const { subpath = "" } = options;
			delete options.subpath;

			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			const url = `/api/v1/${collection}${subpath}?${filterStr}${optionStr === "&" ? "" : optionStr}`;
			// console.log("[DB] UPDATE > url :>> ", url);

			// const updateData = flattenObjectPaths(data);
			const updateData = data;
			// console.log("[DB] UPDATE > updateData :>> ", updateData);
			// console.dir(updateData, { depth: 10 });

			const {
				status,
				data: result = [],
				messages = [""],
			} = await fetchApi<T>({
				url,
				method: "PATCH",
				data: updateData,
			});

			// console.log("[DB] UPDATE > result :>> ", status, "-", result, "-", messages);
			if (!status && messages[0]) logError(`[DB] UPDATE - ${url} :>>`, messages);
			items = result;
		}
		return items as T[];
	}

	static async updateOne<T = any>(collection: DBCollection, filter: any, data: any, options: DBQueryOptions = {}) {
		let items = await this.update(collection, filter, data, options);
		if (!items || items.length === 0) return;
		return items[0] as T;
	}

	static async delete<T = any>(collection: DBCollection, filter: any, options: DBQueryOptions = {}) {
		let item: { ok: boolean; affected: number };
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] DELETE > Service "${collection}" :>> Service not found.`);
				return;
			}
			try {
				item = await svc.softDelete(filter);
			} catch (e) {
				logError(`[DB] DELETE > Service "${collection}" :>>`, e);
			}
		} else {
			const { subpath = "" } = options;
			const filterStr = queryFilterToUrlFilter(filter);
			const url = `/api/v1/${collection}${subpath}?${filterStr.toString()}`;
			const {
				data: result,
				status,
				messages = [""],
			} = await fetchApi<T>({
				url,
				method: "DELETE",
			});
			if (!status && messages[0]) logError(`[DB] DELETE - ${url} :>>`, messages);
			item = result as { ok: boolean; affected: number };
		}
		return item;
	}
}
