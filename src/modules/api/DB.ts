import { logError } from "diginext-utils/dist/console/log";
import { isEmpty } from "lodash";

import { isServerMode } from "@/app.config";
import type { IQueryOptions, IQueryPagination } from "@/interfaces";
import { flattenObjectPaths } from "@/plugins";
import {
	AppService,
	BuildService,
	CloudProviderService,
	ClusterService,
	ContainerRegistryService,
	FrameworkService,
	GitProviderService,
	ProjectService,
	ReleaseService,
	RoleService,
	TeamService,
	UserService,
	WorkspaceService,
} from "@/services";
import CloudDatabaseService from "@/services/CloudDatabaseService";

import fetchApi from "./fetchApi";

type DBCollection =
	| "app"
	| "build"
	| "database"
	| "provider"
	| "cluster"
	| "git"
	| "registry"
	| "framework"
	| "project"
	| "release"
	| "role"
	| "team"
	| "user"
	| "workspace";

export function queryFilterToUrlFilter(filter: any = {}) {
	return Object.entries(filter)
		.map(([key, val]) => {
			if (typeof val === "undefined") return `${key}=undefined`;
			return val !== null ? `${key}=${val}` : null;
		})
		.filter((item) => item !== null)
		.join("&");
}

export function queryOptionsToUrlOptions(options: IQueryOptions & IQueryPagination = {}) {
	let optionsStr = "";

	const { $or, order, populate, select, total, total_items, total_pages, current_page, page_size, next_page, prev_page, ...rest } = options;

	if (!isEmpty(order)) {
		const orderStr = Object.entries(options.order)
			.map(([key, val]) => {
				return val === "ASC" ? key : `-${key}`;
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

export class DB {
	static service = {
		app: new AppService(),
		build: new BuildService(),
		database: new CloudDatabaseService(),
		provider: new CloudProviderService(),
		cluster: new ClusterService(),
		registry: new ContainerRegistryService(),
		framework: new FrameworkService(),
		git: new GitProviderService(),
		project: new ProjectService(),
		release: new ReleaseService(),
		role: new RoleService(),
		team: new TeamService(),
		user: new UserService(),
		workspace: new WorkspaceService(),
	};

	static async find<T = any>(collection: DBCollection, filter: any = {}, options?: IQueryOptions, pagination?: IQueryPagination) {
		let items;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] Service "${collection}" not found.`);
				return;
			}
			items = (await svc.find(filter, options, pagination)) || [];
		} else {
			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			const { data = [], status, messages } = await fetchApi<T>({ url: `/api/v1/${collection}?${filterStr.toString()}${optionStr}` });
			if (!status) logError(`Can't find any items:`, messages);
			items = data;
		}
		return items as T[];
	}

	static async findOne<T = any>(collection: DBCollection, filter: any = {}, options?: IQueryOptions) {
		let item;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] Service "${collection}" not found.`);
				return;
			}
			item = await svc.findOne(filter, options);
		} else {
			const optionStr = queryOptionsToUrlOptions(options);
			const filterStr = queryFilterToUrlFilter(filter);
			const { data, status, messages } = await fetchApi<T>({ url: `/api/v1/${collection}?${filterStr.toString()}&${optionStr}` });
			if (!status) logError(`Item not found:`, messages);
			item = data[0];
		}
		return item as T;
	}

	static async create<T = any>(collection: DBCollection, data: any, options?: IQueryOptions) {
		let item;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] Service "${collection}" not found.`);
				return;
			}
			item = await svc.create(data);
		} else {
			const optionStr = queryOptionsToUrlOptions(options);

			/**
			 * This is working, but use the same flatten method with UPDATE for convenience
			 */
			// let newData = flattenObjectToPost(data);
			// // convert "[var][key]" -> "var[key]"
			// Object.entries(newData).map(([key, val]) => {
			// 	newData[key.replace("[", "").replace("]", "")] = val;
			// 	delete newData[key];
			// });

			/**
			 * use the same flatten method with UPDATE for convenience
			 */
			let newData = flattenObjectPaths(data);

			// console.log("newData :>> ", newData);
			const {
				data: result,
				status,
				messages,
			} = await fetchApi<T>({
				url: `/api/v1/${collection}?${optionStr.toString()}`,
				method: "POST",
				data: newData,
			});
			if (!status && messages && messages.length > 0) logError(`Can't create item:`, messages);
			item = result;
		}
		return item as T;
	}

	static async update<T = any>(collection: DBCollection, filter: any, data: T, options?: IQueryOptions) {
		let items;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] Service "${collection}" not found.`);
				return;
			}
			items = (await svc.update(filter, data, options)) || [];
		} else {
			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr.toString() && "&") + queryOptionsToUrlOptions(options);
			const url = `/api/v1/${collection}?${filterStr.toString()}${optionStr.toString()}`;
			// console.log("[DB] UPDATE > url :>> ", url);

			const updateData = flattenObjectPaths(data);
			// console.log("[DB] UPDATE > updateData :>> ", updateData);
			// logFull(updateData);

			const {
				status,
				data: result = [],
				messages,
			} = await fetchApi<T>({
				url,
				method: "PATCH",
				data: updateData,
			});
			console.log("[DB] UPDATE > result :>> ", result);
			if (!status) logError(`[DB] Can't update item (STATUS = ${status}):`, messages);
			items = result;
		}
		return items as T[];
	}

	static async delete<T = any>(collection: DBCollection, filter: any) {
		let item;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] Service "${collection}" not found.`);
				return;
			}
			item = await svc.delete(filter);
		} else {
			const filterStr = queryFilterToUrlFilter(filter);
			const {
				data: result,
				status,
				messages,
			} = await fetchApi<T>({
				url: `/api/v1/${collection}?${filterStr.toString()}`,
				method: "DELETE",
			});
			if (!status) logError(`Can't delete item:`, messages);
			item = result;
		}
		return item;
	}
}
