import User from "@/entities/User";
import type { IQueryFilter, IQueryOptions } from "@/interfaces";

import BaseService from "./BaseService";

export default class UserService extends BaseService<User> {
	constructor() {
		super(User);
	}

	async create(data: User & { slug?: string; metadata?: any }) {
		if (!data.username) data.username = data.slug;
		return super.create(data);
	}

	async update(filter: IQueryFilter, data: User & { slug?: string; metadata?: any }, options?: IQueryOptions) {
		if (data.username) data.slug = data.username;
		if (data.slug) data.username = data.slug;
		return super.update(filter, data, options);
	}
}
