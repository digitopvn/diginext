import type { EntityTarget, FindManyOptions, FindOptionsSelect, ObjectLiteral } from "@/libs/typeorm";

export interface IQueryPopulate {
	entity: EntityTarget<ObjectLiteral>;
	path: string;
	select: FindOptionsSelect<any>;
}

export interface IQueryParams {
	[key: string]: any;
}

export interface IQueryOptions extends IQueryParams {
	_id?: any;
	populate?: string[];
	select?: string[];
	order?: { [key: string]: string };
	search?: boolean;
	download?: boolean;
	/**
	 * Disable the default `{$set: data}` of "update" query & update `{data}` directly to the items
	 * @default false
	 */
	raw?: boolean;
}

export interface IQueryPagination extends IQueryParams {
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

export interface IQueryFilter extends FindManyOptions {
	[key: string]: any;
}

export interface IResponsePagination {
	total_items?: number;
	total_pages?: number;
	current_page?: number;
	page_size?: number;
	prev_url?: string;
	next_url?: string;
}
