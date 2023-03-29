import User from "@/entities/User";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";

import BaseService from "./BaseService";

export default class UserService extends BaseService<User> {
	constructor() {
		super(User);
	}

	async find(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination): Promise<User[]> {
		if (filter) filter.type = { $nin: ["service_account", "api_key"] };
		return super.find(filter, options, pagination);
	}

	async findOne(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination) {
		if (filter) filter.type = { $nin: ["service_account", "api_key"] };
		return super.findOne(filter, options);
	}

	async create(data: User) {
		if (!data.username) data.username = data.slug;
		if (data.type !== "user") data.type = "user";
		return super.create(data);
	}

	async update(filter: IQueryFilter, data: User, options?: IQueryOptions) {
		if (data.username) data.slug = data.username;
		if (data.slug) data.username = data.slug;
		if (data.type !== "user") data.type = "user";
		return super.update(filter, data, options);
	}
}
