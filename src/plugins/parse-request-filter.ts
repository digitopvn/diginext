import { cloneDeepWith } from "lodash";

import type { IQueryFilter } from "@/interfaces";

import { MongoDB } from "./mongodb";

export const parseRequestFilter = (requestQuery: any) => {
	const {
		id,
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
	} = requestQuery;

	// filter
	let _filter: { [key: string]: any } = id ? { id, ...filter } : filter;

	if (_filter.id) {
		_filter._id = _filter.id;
		delete _filter.id;
	}

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

	/**
	 * Traverse filter object and transform the values.
	 * Need to cast valid {ObjectId} string to {ObjectId} since Mongoose "aggregate" doesn't cast them automatically.
	 * @link https://mongoosejs.com/docs/api/aggregate.html#Aggregate()
	 */
	return cloneDeepWith(_filter, function (value) {
		if (MongoDB.isValidObjectId(value)) return MongoDB.toObjectId(value);
	}) as IQueryFilter;
};
