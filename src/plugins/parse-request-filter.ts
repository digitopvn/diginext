import { isJSON } from "class-validator";
import { isString, trim } from "lodash";

import type { FindManyOptions } from "@/libs/typeorm";

import { isObjectID, isValidObjectID, toObjectID } from "./mongodb";
import { traverseObjectAndTransformValue } from "./traverse";

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
		sort, // @example: -updatedAt,-createdAt
		order, // @example: -updatedAt,-createdAt
		search = false,
		raw = false,
		where = {},
		access_token,
		...filter
	} = requestQuery;

	// filter
	const _filter: { [key: string]: any } = id ? { id, ...filter } : filter;

	// traverse filter object and transform the values:
	traverseObjectAndTransformValue(_filter, ([key, val]) => {
		if (val == null || val == undefined) {
			return null;
		} else if (isObjectID(val)) {
			return val;
		} else if (isValidObjectID(val)) {
			return toObjectID(val);
		} else if (isJSON(val)) {
			return JSON.parse(val);
		} else {
			return val;
		}
	});

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
	return _filter as FindManyOptions<any>;
};
