import type { IUser } from "@/entities/User";
import { userSchema } from "@/entities/User";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";

import BaseService from "./BaseService";

export default class UserService extends BaseService<IUser> {
	constructor() {
		super(userSchema);
	}

	async find(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination) {
		// if (filter) filter.type = { $nin: ["service_account", "api_key"] };
		return super.find(filter, options, pagination);
	}

	async findOne(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination) {
		// if (filter) filter.type = { $nin: ["service_account", "api_key"] };
		return super.findOne(filter, options);
	}

	async create(data) {
		if (!data.username) data.username = data.slug;
		return super.create(data);
	}

	async update(filter: IQueryFilter, data: IUser | any, options?: IQueryOptions) {
		if (data.username) data.slug = data.username;
		if (data.slug) data.username = data.slug;
		return super.update(filter, data, options);
	}
}
