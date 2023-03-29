import ApiKeyAccount from "@/entities/ApiKeyAccount";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";

import BaseService from "./BaseService";

export default class ApiKeyUserService extends BaseService<ApiKeyAccount> {
	constructor() {
		super(ApiKeyAccount);
	}

	async find(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination): Promise<ApiKeyAccount[]> {
		if (filter) filter.type = "api_key";
		return super.find(filter, options, pagination);
	}

	async create(data: ApiKeyAccount) {
		if (!data.username) data.username = data.slug;
		data.type = "api_key";
		return super.create(data);
	}

	async update(filter: IQueryFilter, data: ApiKeyAccount, options?: IQueryOptions) {
		if (data.username) data.slug = data.username;
		if (data.slug) data.username = data.slug;
		if (data.type !== "api_key") data.type = "api_key";
		return super.update(filter, data, options);
	}
}
