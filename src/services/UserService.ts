import User from "@/entities/User";
import type { DeepPartial } from "@/libs/typeorm";

import BaseService from "./BaseService";

export default class UserService extends BaseService<User> {
	constructor() {
		super(User);
	}

	async create(data: DeepPartial<User & { slug?: string; metadata?: any }>) {
		if (!data.username) data.username = data.slug;
		return super.create(data);
	}

	// async update(filter: IQueryFilter, data: ObjectLiteral) {
	// 	if (!data.username) data.username = data.slug;
	// 	return super.update(filter, data);
	// }
}

export { UserService };
