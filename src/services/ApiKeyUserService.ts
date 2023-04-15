import type { IApiKeyAccount } from "@/entities/ApiKeyAccount";
import { apiKeyAccountSchema } from "@/entities/ApiKeyAccount";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";

import BaseService from "./BaseService";

export default class ApiKeyUserService extends BaseService<IApiKeyAccount> {
	constructor() {
		super(apiKeyAccountSchema);
	}

	async find(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination) {
		if (filter) filter.type = "api_key";
		return super.find(filter, options, pagination);
	}

	async create(data: IApiKeyAccount) {
		if (!data.username) data.username = data.slug;
		data.type = "api_key";
		return super.create(data);
	}

	async update(filter: IQueryFilter, data: IApiKeyAccount, options?: IQueryOptions) {
		if (data.username) data.slug = data.username;
		if (data.slug) data.username = data.slug;
		if (data.type !== "api_key") data.type = "api_key";
		return super.update(filter, data, options);
	}
}
