import { isBooleanString, isJSON } from "class-validator";
import { iterate, toBool, toInt } from "diginext-utils/dist/object";
import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Request, Response } from "express";
import { isEmpty, isString, trim } from "lodash";
import { ObjectId } from "mongodb";

import { Config } from "@/app.config";
import type { FindManyOptions, FindOptionsWhere, ObjectLiteral } from "@/libs/typeorm";
import { isValidObjectId } from "@/plugins/mongodb";

import type { IQueryOptions, IQueryPagination, IResponsePagination } from "../interfaces/IQuery";
import type BaseService from "../services/BaseService";

const DEFAULT_PAGE_SIZE = 100;

export default class BaseController<T extends BaseService<ObjectLiteral>> {
	service: T;

	filter: IQueryOptions & FindManyOptions<any>;

	options: IQueryOptions;

	pagination: IResponsePagination;

	where: FindOptionsWhere<any>;

	constructor(service: T) {
		this.service = service;
	}

	async read(req: Request, res: Response, next: NextFunction) {
		let data;
		if (this.filter._id) {
			data = await this.service.findOne(this.filter, this.options);
		} else {
			data = await this.service.find(this.filter, this.options, this.pagination);
		}

		let result: any = { status: 1, data };
		if (this.pagination) result = { ...result, ...this.pagination };

		// assign refreshed token if any:
		// TODO: this is not safe -> should use refresh token!
		const { token } = req as any;
		if (token) result.token = token;

		return res.status(200).json(result);
	}

	async create(req: Request, res: Response, next: NextFunction) {
		const data = await this.service.create(req.body);
		let result: any = { status: 1, data };

		// assign refreshed token if any:
		// TODO: this is not safe -> should use refresh token!
		const { token } = req as any;
		if (token) result.token = token;

		// return ApiResponse.succeed(res, data);
		return res.status(200).json(result);
	}

	async update(req: Request, res: Response, next: NextFunction) {
		const results = await this.service.update(this.filter, req.body, this.options);

		let result: any = { status: 1, data: results };

		// assign refreshed token if any:
		// TODO: this is not safe -> should use refresh token!
		const { token } = req as any;
		if (token) result.token = token;

		// if (results.length == 0) return ApiResponse.failed(res, "Items not found.");
		if (results.length == 0) {
			result.status = 0;
			result.messages = ["Items not found."];
			return res.status(200).json(result);
		}

		// return ApiResponse.succeed(res, results);
		return res.status(200).json(result);
	}

	async delete(req: Request, res: Response, next: NextFunction) {
		const data = await this.service.delete(this.filter);
		// console.log(`delete result >>`, result);

		let result: any = { status: 1, data };

		// assign refreshed token if any:
		// TODO: this is not safe -> should use refresh token!
		const { token } = req as any;
		if (token) result.token = token;

		// if (result.ok == 0) return ApiResponse.failed(res, "Items not found.");
		if (result.ok == 0) {
			result.status = 0;
			result.messages = ["Items not found."];
			return res.status(200).json(result);
			// return ApiResponse.failed(res, "Items not found.");
		}

		// return ApiResponse.succeed(res, data);
		return res.status(200).json(result);
	}

	async softDelete(req: Request, res: Response, next: NextFunction) {
		const data = await this.service.softDelete(this.filter);

		let result: any = { status: 1, data };

		// assign refreshed token if any:
		// TODO: this is not safe -> should use refresh token!
		const { token } = req as any;
		if (token) result.token = token;

		return res.status(200).json(result);
		// return ApiResponse.succeed(res, data);
	}

	async empty(req: Request, res: Response, next: NextFunction) {
		if (Config.ENV === "development") {
			const data = await this.service.empty(this.filter);
			if (data.ok == 0) return ApiResponse.failed(res, data.error);
			return ApiResponse.succeed(res, data);
		} else {
			return ApiResponse.failed(`This function is restricted to use on development environment only.`);
		}
	}

	parseDateRange(req: Request, res: Response, next: NextFunction) {
		// TODO: process date range filter: from_date, to_date, from_time, to_time, date
		next();
	}

	parseBody(req: Request, res: Response, next: NextFunction) {
		// log("req.body [1] >>", req.body);

		req.body = iterate(req.body, (obj, key, val) => {
			// log(`key, val =>`, key, val);
			if (isValidObjectId(val)) obj[key] = new ObjectId(val);
			if (isBooleanString(val)) obj[key] = toBool(val);
		});

		// log("req.body >>", req.body);

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
			where = {},
			...filter
		} = req.query as any;

		// parse "sort" (or "order") from the query url:
		let _sortOptions: string[];
		if (sort) _sortOptions = sort.indexOf(",") > -1 ? sort.split(",") : [sort];
		if (order) _sortOptions = order.indexOf(",") > -1 ? order.split(",") : [order];
		const sortOptions: { [key: string]: string } = {};
		if (_sortOptions)
			_sortOptions.forEach((s) => {
				const isDesc = s.charAt(0) === "-";
				const key = isDesc ? s.substring(1) : s;
				const sortValue: string = isDesc ? "DESC" : "ASC";
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

		// pagination
		if (this.pagination.page_size) {
			options.skip = (this.pagination.current_page ?? 1) * this.pagination.page_size;
			options.limit = this.pagination.page_size;
		}

		if (limit > 0) options.limit = limit;
		if (skip) options.skip = skip;

		this.options = options;
		// console.log(`this.options :>>`, this.options);

		// filter
		const _filter: { [key: string]: any } = { id, ...filter };

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
