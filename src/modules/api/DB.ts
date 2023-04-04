import { isJSON } from "class-validator";
import { logError } from "diginext-utils/dist/console/log";
import { isEmpty } from "lodash";
import { ObjectId } from "mongodb";

import { isServerMode } from "@/app.config";
import type { IQueryOptions, IQueryPagination } from "@/interfaces";
import { flattenObjectPaths } from "@/plugins";
import { isValidObjectId } from "@/plugins/mongodb";
import {
	ApiKeyUserService,
	AppService,
	BuildService,
	CloudDatabaseService,
	CloudProviderService,
	ClusterService,
	ContainerRegistryService,
	FrameworkService,
	GitProviderService,
	ProjectService,
	ReleaseService,
	RoleService,
	ServiceAccountService,
	TeamService,
	UserService,
	WorkspaceService,
} from "@/services";

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
	| "api_key_user"
	| "service_account"
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

const app = new AppService();
const build = new BuildService();
const database = new CloudDatabaseService();
const provider = new CloudProviderService();
const cluster = new ClusterService();
const registry = new ContainerRegistryService();
const framework = new FrameworkService();
const git = new GitProviderService();
const project = new ProjectService();
const release = new ReleaseService();
const role = new RoleService();
const team = new TeamService();
const user = new UserService();
const api_key_user = new ApiKeyUserService();
const service_account = new ServiceAccountService();
const workspace = new WorkspaceService();

export class DB {
	static service = {
		app,
		build,
		database,
		provider,
		cluster,
		registry,
		framework,
		git,
		project,
		release,
		role,
		team,
		user,
		api_key_user,
		service_account,
		workspace,
	};

	static transformFilter(filter: any) {
		const _filter = { ...filter };
		Object.entries(filter).forEach(([key, val]) => {
			if (key == "id" || key == "_id") {
				_filter._id = isValidObjectId(val) ? new ObjectId(val as string) : val;
				delete _filter.id;
			}
			if (val == null || val == undefined) {
				_filter[key] = null;
			} else if (isValidObjectId(val)) {
				_filter[key] = new ObjectId(val as string);
			} else if (isJSON(val)) {
				_filter[key] = JSON.parse(val as string);
			} else {
				_filter[key] = val;
			}
		});
		return _filter;
	}

	static async count(collection: DBCollection, filter: any = {}, options?: IQueryOptions, pagination?: IQueryPagination) {
		let amount: number;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] COUNT :>> Service "${collection}" not found.`);
				return;
			}
			try {
				amount = (await svc.count(DB.transformFilter(filter), options)) || 0;
			} catch (e) {
				logError(`[DB] COUNT > Service "${collection}" :>>`, e);
			}
		} else {
			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			const url = `/api/v1/${collection}?${filterStr.toString()}&${optionStr}`;

			const { data = [], status, messages = [""] } = await fetchApi({ url });
			if (!status && messages[0]) logError(`[DB] COUNT - ${url} :>>`, messages);

			amount = data;
		}
		return amount;
	}

	static async find<T = any>(collection: DBCollection, filter: any = {}, options?: IQueryOptions, pagination?: IQueryPagination) {
		let items;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] FIND :>> Service "${collection}" not found.`);
				return;
			}
			try {
				items = (await svc.find(DB.transformFilter(filter), options, pagination)) || [];
			} catch (e) {
				logError(`[DB] FIND > Service "${collection}" :>>`, e);
				items = [];
			}
		} else {
			const filterStr = queryFilterToUrlFilter(filter);
			const optionStr = (filterStr ? "&" : "") + queryOptionsToUrlOptions(options);
			const url = `/api/v1/${collection}?${filterStr.toString()}&${optionStr}`;

			const { data = [], status, messages = [""] } = await fetchApi<T>({ url });
			if (!status && messages[0]) logError(`[DB] FIND MANY - ${url} :>>`, messages);

			items = data;
		}
		return items as T[];
	}

	static async findOne<T = any>(collection: DBCollection, filter: any = {}, options?: IQueryOptions) {
		let item;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] FIND ONE > Service "${collection}" not found.`);
				return;
			}
			try {
				item = await svc.findOne(DB.transformFilter(filter), options);
			} catch (e) {
				logError(`[DB] FIND ONE > Service "${collection}" :>>`, e);
			}
		} else {
			const optionStr = queryOptionsToUrlOptions(options);
			const filterStr = queryFilterToUrlFilter(filter);
			const url = `/api/v1/${collection}?${filterStr.toString()}&${optionStr}`;

			const { data = [], status, messages = [""] } = await fetchApi<T>({ url });
			if (!status && messages[0]) logError(`[DB] FIND ONE - ${url} :>>`, messages);
			item = data[0];
		}
		return item as T;
	}

	static async create<T = any>(collection: DBCollection, data: any, options?: IQueryOptions) {
		let item;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] CREATE :>> Service "${collection}" not found.`);
				return;
			}
			try {
				item = await svc.create(data);
			} catch (e) {
				logError(`[DB] CREATE > Service "${collection}" :>>`, e);
			}
		} else {
			/**
			 * <u>Notes</u>: use the same flatten method with UPDATE for convenience!
			 */
			let newData = flattenObjectPaths(data);
			const optionStr = queryOptionsToUrlOptions(options);
			const url = `/api/v1/${collection}?${optionStr.toString()}`;
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
			item = result;
		}
		return item as T;
	}

	static async update<T = any>(collection: DBCollection, filter: any, data: any, options?: IQueryOptions) {
		let items;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] UPDATE > Service "${collection}" :>> Service not found.`);
				return;
			}

			try {
				items = (await svc.update(DB.transformFilter(filter), data, options)) || [];
			} catch (e) {
				logError(`[DB] UPDATE > Service "${collection}" :>>`, e);
				items = [];
			}
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

	static async delete<T = any>(collection: DBCollection, filter: any) {
		let item;
		if (isServerMode) {
			const svc = DB.service[collection];
			if (!svc) {
				logError(`[DB] DELETE > Service "${collection}" :>> Service not found.`);
				return;
			}
			try {
				item = await svc.softDelete(DB.transformFilter(filter));
			} catch (e) {
				logError(`[DB] DELETE > Service "${collection}" :>>`, e);
			}
		} else {
			const filterStr = queryFilterToUrlFilter(filter);
			const url = `/api/v1/${collection}?${filterStr.toString()}`;
			const {
				data: result,
				status,
				messages = [""],
			} = await fetchApi<T>({
				url,
				method: "DELETE",
			});
			if (!status && messages[0]) logError(`[DB] DELETE - ${url} :>>`, messages);
			item = result;
		}
		return item;
	}
}
