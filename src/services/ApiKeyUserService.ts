import User from "@/entities/User";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";

import BaseService from "./BaseService";

export default class ApiKeyUserService extends BaseService<User> {
	constructor() {
		super(User);
	}

	async find(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination): Promise<User[]> {
		if (filter) filter.type = "api_key";
		return super.find(filter, options, pagination);
	}

	async create(data: User) {
		if (!data.username) data.username = data.slug;
		data.type = "api_key";
		return super.create(data);
	}

	async update(filter: IQueryFilter, data: User, options?: IQueryOptions) {
		if (data.username) data.slug = data.username;
		if (data.slug) data.username = data.slug;
		if (data.type !== "api_key") data.type = "api_key";
		return super.update(filter, data, options);
	}
}
