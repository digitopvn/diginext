import { isBooleanString, isNumberString } from "class-validator";
import { toInt } from "diginext-utils/dist/object";
import { isBoolean, isDate, isEmpty, isNumber, isString, trim } from "lodash";

import type { IQueryOptions, IQueryPagination } from "@/interfaces";
import type { AppRequest } from "@/interfaces/SystemTypes";
import { DEFAULT_PAGE_SIZE } from "@/services";

import { isValidObjectId } from "./mongodb";
import { parseRequestFilter } from "./parse-request-filter";

export function parseFilterAndOptions(req: AppRequest) {
	const {
		download = false,
		skip,
		limit = 0,
		page = 1,
		size: page_size = 0,
		populate,
		select,
		status,
		sort, // @example: -updatedAt,-createdAt
		order, // @example: -updatedAt,-createdAt
		search = false,
		raw = false,
		full = false,
		where = {},
		access_token,
		refresh_token,
		isDebugging = false,
		...filter
	} = req.query as any;

	// parse "populate" & "select"
	const _populate = populate ? trim(populate.toString(), ",") : "";
	const _select = select ? trim(select.toString(), ",") : "";
	const options: IQueryOptions & IQueryPagination = {
		isDebugging,
		download,
		full,
		status,
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
	if (page && page_size) {
		options.skip = ((page ?? 1) - 1) * page_size;
		options.limit = page_size;
	}

	if (limit > 0) options.limit = limit;
	if (skip) options.skip = skip;

	// assign to controller:
	return { options, filter: parseRequestFilter({ ...filter }) };
}

export async function parsePagination(service: any, req: AppRequest) {
	if (!service) return;

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
		full = false,
		isDebugging = false,
		access_token,
		refresh_token,
		...filter
	} = req.query;

	const pageOptions = { skip: toInt(skip), limit: toInt(limit), page: toInt(page), size: toInt(size) };
	// log(`pageOptions >>`, pageOptions);

	total_items = await service.count(filter);
	total_pages = limit == 0 ? 1 : Math.ceil(total_items / pageOptions.limit);

	if (pageOptions.size > 0) page_size = pageOptions.size;
	if (pageOptions.page > 0) current_page = pageOptions.page;

	// const totalSkip = skip > 0 ? pageOptions.skip : current_page > 0 ? (current_page - 1) * page_size : undefined;
	const totalLimit = pageOptions.limit > 0 ? pageOptions.limit : page_size > 0 ? page_size : undefined;

	if (totalLimit) total_pages = Math.ceil(total_items / totalLimit);
	// if (totalSkip) page_size = totalSkip;
	// log(`totalSkip >>`, totalSkip);

	return {
		total_items,
		total_pages,
		current_page,
		page_size,
	};
}
