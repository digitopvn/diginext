import { isBooleanString, isJSON, isNumberString } from "class-validator";
import { iterate, toBool, toInt } from "diginext-utils/dist/object";
// import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";
import { isEmpty, isString, toNumber, trim } from "lodash";
import { ObjectId } from "mongodb";

import { Config } from "@/app.config";
import type { User, Workspace } from "@/entities";
import type Base from "@/entities/Base";
import type { FindManyOptions, FindOptionsWhere } from "@/libs/typeorm";
import { DB } from "@/modules/api/DB";
import { isValidObjectId } from "@/plugins/mongodb";
import type { BaseService } from "@/services/BaseService";

import type { IQueryOptions, IQueryPagination, IResponsePagination } from "../interfaces/IQuery";
import type { ResponseData } from "../interfaces/ResponseData";

const DEFAULT_PAGE_SIZE = 100;

export default class BaseController<T extends Base> {
	user: User;

	workspace: Workspace;

	// service: BaseService<T>;

	filter: IQueryOptions & FindManyOptions<any>;

	options: IQueryOptions;

	pagination: IResponsePagination;

	where: FindOptionsWhere<any>;

	constructor(protected service?: BaseService<T>) {
		// if (service) this.service = service;
	}

	apiRespond(executor) {
		return async (req: Request, res: Response, next: NextFunction) => {
			try {
				this.user = req.user as User;
				// console.log("this.user :>> ", this.user);

				if (!isEmpty(this.user?.activeWorkspace)) {
					const wsId = (this.user?.activeWorkspace as Workspace)._id || (this.user?.activeWorkspace as any);
					this.workspace =
						typeof (this.user?.activeWorkspace as any)._id === "undefined"
							? (this.user?.activeWorkspace as Workspace)
							: await DB.findOne<Workspace>("workspace", { _id: wsId });
				}

				let result = await executor(req.body);
				res.status(200).json(result);
			} catch (e) {
				// forward the error to Express.js Error Handling Route
				next(e);
			}
		};
	}

	async read() {
		// console.log("this.filter :>> ", this.filter);

		let data: T | T[];
		if (this.filter._id) {
			data = await this.service.findOne(this.filter, this.options);
		} else {
			data = await this.service.find(this.filter, this.options, this.pagination);
		}

		let result: ResponseData | (ResponseData & { data: typeof data }) = { status: 1, data, messages: [] };

		// assign refreshed token if any:
		// const { token } = req as any;
		// if (token) result.token = token;

		return result;
	}

	async create(inputData) {
		const data = await this.service.create(inputData);

		let result: ResponseData | (ResponseData & { data: typeof data }) = { status: 1, data, messages: [] };

		return result;
	}

	async update(updateData) {
		const data = await this.service.update(this.filter, updateData, this.options);
		let result: ResponseData | (ResponseData & { data: typeof data }) = { status: 1, data, messages: [] };

		return result;
	}

	async delete() {
		const data = await this.service.delete(this.filter);
		let result: ResponseData | (ResponseData & { data: typeof data }) = { status: 1, data, messages: [] };

		return result;
	}

	async softDelete() {
		const data = await this.service.softDelete(this.filter);

		let result: ResponseData | (ResponseData & { data: typeof data }) = { status: 1, data, messages: [] };
		return result;
	}

	async empty() {
		let data: { ok: number };
		let result: ResponseData | (ResponseData & { data: typeof data }) = { status: 1, data, messages: [] };

		if (Config.ENV === "development") {
			const emptyRes = await this.service.empty(this.filter);
			result.data.ok = emptyRes.ok;
		} else {
			result.data = { ok: 0 };
			result.messages.push(`This function is restricted to use on development environment only.`);
		}

		return result;
	}

	parseDateRange(req: Request, res: Response, next: NextFunction) {
		// TODO: process date range filter: from_date, to_date, from_time, to_time, date
		this.service.req = req;

		next();
	}

	parseBody(req: Request, res: Response, next: NextFunction) {
		// log("req.body [1] >>", req.body);
		this.service.req = req;

		req.body = iterate(req.body, (obj, key, val) => {
			// log(`key, val =>`, key, val);
			if (isValidObjectId(val)) {
				obj[key] = new ObjectId(val);
			} else if (isNumberString(val)) {
				obj[key] = toNumber(val);
			} else if (isBooleanString(val)) {
				obj[key] = toBool(val);
			} else {
				obj[key] = val;
			}
		});

		next();
	}

	/**
	 * Parse the filter option from the URL:
	 * - List (first page, 10 item per page, sort "desc" by "updatedAt" first, then "desc" by "createdAt"): `https://example.com/api/v1/user?page=1&size=10&sort=-updatedAt,-createdAt`
	 * - Search (by username that contains "john"): `https://example.com/api/v1/user?page=1&size=10&username=john&search=true`
	 */
	parseFilter(req: Request, res: Response, next: NextFunction) {
		// log("req.query >>", req.query);
		// return req.query;
		this.service.req = req;

		const {
			id,
			download = false,
			skip,
			limit = 0,
			page = 1,
			size = 0,
			populate,
			select,
			sort, // @example: -updatedAt,-createdAt
			order, // @example: -updatedAt,-createdAt
			search = false,
			raw = false,
			where = {},
			access_token,
			...filter
		} = req.query as any;

		// parse "sort" (or "order") from the query url:
		let _sortOptions: string[];
		if (sort) _sortOptions = sort.indexOf(",") > -1 ? sort.split(",") : [sort];
		if (order) _sortOptions = order.indexOf(",") > -1 ? order.split(",") : [order];
		const sortOptions: { [key: string]: "DESC" | "ASC" } = {};
		if (_sortOptions)
			_sortOptions.forEach((s) => {
				const isDesc = s.charAt(0) === "-";
				const key = isDesc ? s.substring(1) : s;
				const sortValue: "DESC" | "ASC" = isDesc ? "DESC" : "ASC";
				sortOptions[key] = sortValue;
			});

		// options
		const _populate = populate ? trim(populate.toString(), ",") : "";
		const _select = select ? trim(select.toString(), ",") : "";
		const options: IQueryOptions & IQueryPagination = {
			download,
			populate: _populate == "" ? [] : _populate.indexOf(",") > -1 ? _populate.split(",") : [_populate],
			select: _select == "" ? [] : _select.indexOf(",") > -1 ? _select.split(",") : [_select],
		};
		if (!isEmpty(sortOptions)) options.order = sortOptions;
		if (raw === "true" || raw === true) options.raw = true;

		// pagination
		if (this.pagination.page_size) {
			options.skip = ((this.pagination.current_page ?? 1) - 1) * this.pagination.page_size;
			options.limit = this.pagination.page_size;
		}

		if (limit > 0) options.limit = limit;
		if (skip) options.skip = skip;

		this.options = options;
		// console.log(`this.options :>>`, this.options);

		// filter
		const _filter: { [key: string]: any } = id ? { id, ...filter } : filter;

		// convert search to boolean
		// log("search >>", search);
		// console.log("[1] _filter :>> ", _filter);
		Object.entries(_filter).forEach(([key, val]) => {
			if (val == null || val == undefined) {
				_filter[key] = null;
			} else if (key == "id" || key == "_id") {
				_filter._id = isValidObjectId(val) ? new ObjectId(val) : val;
				delete _filter.id;
			} else if (isValidObjectId(val)) {
				_filter[key] = new ObjectId(val);
			} else if (isJSON(val)) {
				_filter[key] = JSON.parse(val);
			} else {
				_filter[key] = val;
			}
		});

		if (!_filter.id) delete _filter.id;

		// manipulate "$or" & "$and" filter:
		if (_filter.or) {
			_filter.$or = _filter.or;
			delete _filter.or;
		}
		if (_filter.and) {
			_filter.$and = _filter.and;
			delete _filter.and;
		}

		// console.log("[2] _filter :>> ", _filter);

		if (search === true) {
			Object.entries(_filter).forEach(([key, val]) => {
				_filter[key] = isString(val) ? { $regex: trim(val), $options: "i" } : val;
			});
		} else {
			Object.entries(_filter).forEach(([key, val]) => {
				_filter[key] = isString(val) ? trim(val) : val;
			});
		}

		// save to local storage of response
		this.filter = _filter as IQueryOptions & FindManyOptions<any>;
		// log({ filter: this.filter });

		next();
	}

	async parsePagination(req: Request, res: Response, next: NextFunction) {
		this.service.req = req;

		let total_items = 0,
			total_pages = 0,
			current_page = 1,
			page_size = 0;

		const {
			id,
			download,
			skip,
			limit = 0,
			page = 1,
			size = DEFAULT_PAGE_SIZE,
			populate,
			select,
			sort = "createdAt",
			search = false,
			access_token,
			...filter
		} = req.query;

		const pageOptions = { skip: toInt(skip), limit: toInt(limit), page: toInt(page), size: toInt(size) };
		// log(`pageOptions >>`, pageOptions);

		total_items = await this.service.count(filter);
		total_pages = limit == 0 ? 1 : Math.ceil(total_items / pageOptions.limit);

		if (pageOptions.size > 0) page_size = pageOptions.size;
		if (pageOptions.page > 0) current_page = pageOptions.page;

		// const totalSkip = skip > 0 ? pageOptions.skip : current_page > 0 ? (current_page - 1) * page_size : undefined;
		const totalLimit = limit > 0 ? pageOptions.limit : page_size > 0 ? page_size : undefined;

		if (totalLimit) total_pages = Math.ceil(total_items / totalLimit);
		// if (totalSkip) page_size = totalSkip;
		// log(`totalSkip >>`, totalSkip);

		this.pagination = {
			total_items,
			total_pages,
			current_page,
			page_size,
		};
		// log(`this.pagination >>`, this.pagination);

		next();
	}
}
