import { isBooleanString, isJSON, isNumberString } from "class-validator";
import { toBool, toInt } from "diginext-utils/dist/object";
// import { Response as ApiResponse } from "diginext-utils/dist/response";
import type { NextFunction, Response } from "express";
import { cloneDeepWith, isBoolean, isDate, isEmpty, isNumber, isString, toNumber, trim } from "lodash";

import { Config } from "@/app.config";
import type { IUser, IWorkspace } from "@/entities";
import type { IBase } from "@/entities/Base";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { isObjectId, isValidObjectId, MongoDB, toObjectId } from "@/plugins/mongodb";
import { parseRequestFilter } from "@/plugins/parse-request-filter";
import type { BaseService } from "@/services/BaseService";

import type { IQueryFilter, IQueryOptions, IQueryPagination, IResponsePagination } from "../interfaces/IQuery";
import type { ResponseData } from "../interfaces/ResponseData";
import { respondFailure, respondSuccess } from "../interfaces/ResponseData";

const DEFAULT_PAGE_SIZE = 100;

export default class BaseController<T extends IBase = any, S extends BaseService<T> = BaseService> {
	service: S;

	user: IUser;

	workspace: IWorkspace;

	filter: IQueryFilter;

	options: IQueryOptions;

	pagination: IResponsePagination;

	constructor(service?: S) {
		if (service) this.service = service;
	}

	async read() {
		if (!this.filter) this.filter = {};

		let data: T | T[];
		if (this.filter._id) {
			data = await this.service.findOne(this.filter, this.options);
			if (isEmpty(data)) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `Item not found.` });
		} else {
			data = await this.service.find(this.filter, this.options, this.pagination);
			if (isEmpty(data)) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: "" });
		}

		return respondSuccess({ data, ...this.pagination });
	}

	async create(inputData) {
		const data = await this.service.create(inputData);

		if (!data) return respondFailure("Can't create new item.");

		return respondSuccess({ data });
	}

	async update(updateData) {
		const data = await this.service.update(this.filter, updateData, this.options);
		if (isEmpty(data)) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `Item not found.` });

		return respondSuccess({ data });
	}

	async delete() {
		const tobeDeletedItems = await this.service.count(this.filter);
		if (tobeDeletedItems === 0) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `Items not found.` });

		const data = await this.service.delete(this.filter);
		return respondSuccess({ data });
	}

	async softDelete() {
		const tobeDeletedItems = await this.service.count(this.filter);
		if (tobeDeletedItems === 0) return this.filter.owner ? respondFailure({ msg: `Unauthorized.` }) : respondFailure({ msg: `Items not found.` });

		const data = await this.service.softDelete(this.filter);
		return respondSuccess({ data });
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

	parseDateRange(req: AppRequest, res?: Response, next?: NextFunction) {
		// TODO: process date range filter: from_date, to_date, from_time, to_time, date

		if (next) next();
	}

	parseBody(req: AppRequest, res?: Response, next?: NextFunction) {
		// log("req.body [1] >>", req.body);

		req.body = cloneDeepWith(req.body, function (val) {
			if (isValidObjectId(val)) return MongoDB.toString(toObjectId(val));
			if (isObjectId(val)) return MongoDB.toString(val);
			if (isNumberString(val)) return toNumber(val);
			if (isBooleanString(val)) return toBool(val);
			if (isJSON(val)) return JSON.parse(val);
		});

		if (next) next();
	}

	/**
	 * Parse the filter option from the URL:
	 * - List (first page, 10 item per page, sort "desc" by "updatedAt" first, then "desc" by "createdAt"): `https://example.com/api/v1/user?page=1&size=10&sort=-updatedAt,-createdAt`
	 * - Search (by username that contains "john"): `https://example.com/api/v1/user?page=1&size=10&username=john&search=true`
	 */
	parseFilter(req: AppRequest, res?: Response, next?: NextFunction) {
		const {
			download = false,
			skip,
			limit = 0,
			page = 1,
			size = 0,
			populate,
			select,
			status,
			sort, // @example: -updatedAt,-createdAt
			order, // @example: -updatedAt,-createdAt
			search = false,
			raw = false,
			where = {},
			access_token,
			...filter
		} = req.query as any;

		// parse "populate" & "select"
		const _populate = populate ? trim(populate.toString(), ",") : "";
		const _select = select ? trim(select.toString(), ",") : "";
		const options: IQueryOptions & IQueryPagination = {
			download,
			populate: _populate == "" ? [] : _populate.indexOf(",") > -1 ? _populate.split(",") : [_populate],
			select: _select == "" ? [] : _select.indexOf(",") > -1 ? _select.split(",") : [_select],
		};

		// parse "search"
		if (search === true) {
			Object.entries(filter).forEach(([key, val]) => {
				filter[key] =
					isString(val) &&
					!isValidObjectId(val) &&
					!isBoolean(val) &&
					!isDate(val) &&
					!isNumber(val) &&
					!isBooleanString(val) &&
					!isNumberString(val)
						? { $regex: trim(val), $options: "i" }
						: val;
			});
		}
		// else {
		// 	Object.entries(filter).forEach(([key, val]) => {
		// 		filter[key] = isString(val) ? trim(val) : val;
		// 	});
		// }

		// parse "sort" (or "order") from the query url:
		let _sortOptions: string[];
		if (sort) _sortOptions = sort.indexOf(",") > -1 ? sort.split(",") : [sort];
		if (order) _sortOptions = order.indexOf(",") > -1 ? order.split(",") : [order];
		const sortOptions: { [key: string]: 1 | -1 } = {};
		if (_sortOptions)
			_sortOptions.forEach((s) => {
				const isDesc = s.charAt(0) === "-";
				const key = isDesc ? s.substring(1) : s;
				const sortValue: 1 | -1 = isDesc ? -1 : 1;
				sortOptions[key] = sortValue;
			});
		if (!isEmpty(sortOptions)) options.order = sortOptions;
		if (raw === "true" || raw === true) options.raw = true;

		// parse "pagination"
		if (this.pagination && this.pagination.page_size) {
			options.skip = ((this.pagination.current_page ?? 1) - 1) * this.pagination.page_size;
			options.limit = this.pagination.page_size;
		}

		if (limit > 0) options.limit = limit;
		if (skip) options.skip = skip;

		// assign to controller:
		this.options = options;
		this.filter = parseRequestFilter({ ...filter });

		if (next) next();
	}

	async parsePagination(req: AppRequest, res?: Response, next?: NextFunction) {
		if (!this.service) return;

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
			status,
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
		const totalLimit = pageOptions.limit > 0 ? pageOptions.limit : page_size > 0 ? page_size : undefined;

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

		if (next) next();
	}
}
