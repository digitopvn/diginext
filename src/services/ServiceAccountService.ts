import User from "@/entities/User";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";

import BaseService from "./BaseService";

export default class ServiceAccountService extends BaseService<User> {
	constructor() {
		super(User);
	}

	async find(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination): Promise<User[]> {
		if (filter) filter.type = "service_account";
		return super.find(filter, options, pagination);
	}

	async create(data: User) {
		if (!data.username) data.username = data.slug;
		data.type = "service_account";
		return super.create(data);
	}

	async update(filter: IQueryFilter, data: User, options?: IQueryOptions) {
		if (data.username) data.slug = data.username;
		if (data.slug) data.username = data.slug;
		if (data.type !== "service_account") data.type = "service_account";
		return super.update(filter, data, options);
	}
}
