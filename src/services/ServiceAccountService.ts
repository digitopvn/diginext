import type { IServiceAccount } from "@/entities/ServiceAccount";
import { serviceAccountSchema } from "@/entities/ServiceAccount";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";

import BaseService from "./BaseService";

export default class ServiceAccountService extends BaseService<IServiceAccount> {
	constructor() {
		super(serviceAccountSchema);
	}

	async find(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination) {
		if (filter) filter.type = "service_account";
		return super.find(filter, options, pagination);
	}

	async create(data: IServiceAccount) {
		if (!data.username) data.username = data.slug;
		data.type = "service_account";
		return super.create(data);
	}

	async update(filter: IQueryFilter, data: IServiceAccount, options?: IQueryOptions) {
		if (data.username) data.slug = data.username;
		if (data.slug) data.username = data.slug;
		if (data.type !== "service_account") data.type = "service_account";
		return super.update(filter, data, options);
	}
}
