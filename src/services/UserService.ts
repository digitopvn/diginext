import User from "@/entities/User";

import BaseService from "./BaseService";

export default class UserService extends BaseService<User> {
	constructor() {
		super(User);
	}

	async create(data: User & { slug?: string; metadata?: any }) {
		if (!data.username) data.username = data.slug;
		return super.create(data);
	}
}
