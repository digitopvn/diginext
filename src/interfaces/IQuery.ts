import type { FilterQuery, QueryWithHelpers } from "mongoose";

export interface IQueryGeneral {
	[key: string]: any;
}

export interface IPaginationQueryParams {
	page?: number;
	size?: number;
	limit?: number;
	skip?: number;
}

export interface IPostQueryParams {
	/**
	 * Fields to populate, seperated by commas, for example: `owner,workspace`
	 */
	populate?: string;
	select?: string;
	/**
	 * @example "-updatedAt,-createdAt"
	 */
	order?: string;
	/**
	 * Disable the default `{$set: body}` of "update" query & update `{body}` directly to the items
	 * @default false
	 */
	raw?: boolean;
}

export interface IPatchQueryParams extends IPostQueryParams {
	/**
	 * Find one item by `{ObjectID}`
	 */
	_id?: string;

	/**
	 * Find one item by slug
	 */
	slug?: string;
}

export interface IDeleteQueryParams {
	/**
	 * Delete one item by `{ObjectID}`
	 */
	id?: string;
	/**
	 * Delete one item by `{slug}`
	 */
	slug?: string;
}

export interface IGetQueryParams extends IPostQueryParams, IPaginationQueryParams {
	/**
	 * Find one item by `{ObjectID}`
	 */
	id?: string;
	_id?: string;
	/**
	 * Mark this request as search (return the similar results based on the filter query params)
	 * @default true
	 */
	search?: boolean;
	/**
	 * If `true`, return the excel binary file to download.
	 * @default false
	 */
	download?: boolean;
}

export interface IQueryOptions extends IQueryGeneral {
	_id?: any;
	/**
	 * @example { populate: ["owner", "workspace"] }
	 */
	populate?: string[];
	/**
	 * @example { select: ["_id", "name", "slug"] }
	 */
	select?: string[];
	/**
	 * @example { order: { createdAt: -1 } }
	 */
	order?: { [key: string]: 1 | -1 };
	/**
	 * If `TRUE`, return the closest results of filter
	 * @default false
	 */
	search?: boolean;
	/**
	 * @default false
	 */
	download?: boolean;
	/**
	 * If `TRUE`, return the full data, otherwise only return optimal data.
	 * @default false
	 */
	full?: boolean;
	/**
	 * Disable the default `{$set: body}` of "update" query & update `{body}` directly to the items
	 * @default false
	 */
	raw?: boolean;
	/**
	 * Should check for item's status
	 * @default false
	 */
	status?: boolean;
	/**
	 * Should include deleted items
	 */
	deleted?: boolean;
	/**
	 * Cache
	 */
	cache?: boolean;
	/**
	 * Debug
	 * @default false
	 */
	isDebugging?: boolean;
}

export interface IQueryPagination extends IQueryGeneral {
	limit?: number;
	page?: number;
	size?: number;
	skip?: number;
	total?: number;
	total_items?: number;
	total_pages?: number;
	current_page?: number;
	page_size?: number;
	next_page?: string;
	prev_page?: string;
}

export type IQueryFilter<T = any> = FilterQuery<T>;
export interface ServiceFilter<ResultType, DocType> extends QueryWithHelpers<ResultType, DocType> {}

export interface IResponsePagination {
	total_items?: number;
	total_pages?: number;
	current_page?: number;
	page_size?: number;
	prev_url?: string;
	next_url?: string;
}

export interface HiddenBodyKeys {
	id?: unknown;
	_id?: unknown;
	metadata?: unknown;
	owner?: unknown;
	workspace?: unknown;
	createdAt?: unknown;
	deletedAt?: unknown;
	updatedAt?: unknown;
}
