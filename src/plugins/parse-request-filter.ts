import { isJSON } from "class-validator";
import { isString, trim } from "lodash";
import { ObjectId } from "mongodb";

import type { IQueryOptions } from "@/interfaces";
import type { FindManyOptions } from "@/libs/typeorm";

import { isValidObjectId } from "./mongodb";

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

	// convert search to boolean
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
	return _filter as IQueryOptions & FindManyOptions<any>;
};
