import ServiceAccount from "@/entities/ServiceAccount";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";

import BaseService from "./BaseService";

export default class ServiceAccountService extends BaseService<ServiceAccount> {
	constructor() {
		super(ServiceAccount);
	}

	async find(filter?: IQueryFilter, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination): Promise<ServiceAccount[]> {
		if (filter) filter.type = "service_account";
		return super.find(filter, options, pagination);
	}

	async create(data: ServiceAccount) {
		if (!data.username) data.username = data.slug;
		data.type = "service_account";
		console.log("data :>> ", data);
		return super.create(data);
	}

	async update(filter: IQueryFilter, data: ServiceAccount, options?: IQueryOptions) {
		if (data.username) data.slug = data.username;
		if (data.slug) data.username = data.slug;
		if (data.type !== "service_account") data.type = "service_account";
		return super.update(filter, data, options);
	}
}
