import type { IContainerRegistry } from "@/entities/ContainerRegistry";
import { containerRegistrySchema } from "@/entities/ContainerRegistry";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export class ContainerRegistryService extends BaseService<IContainerRegistry> {
	constructor(ownership?: Ownership) {
		super(containerRegistrySchema, ownership);
	}

	findAll(
		filter?: IQueryFilter<IContainerRegistry>,
		options?: IQueryOptions & IQueryPagination,
		pagination?: IQueryPagination
	): Promise<IContainerRegistry[]> {
		let includePublicFilter: any = { $or: [] };

		// include all public clusters
		// if (!filter.workspace) {
		includePublicFilter.$or.push(filter);
		includePublicFilter.$or.push({ ...filter, workspace: { $exists: false } }, { ...filter, workspace: null });
		// }

		// check access permissions
		if (this.user?.allowAccess?.clusters?.length) includePublicFilter.$or.push({ _id: { $in: this.user?.allowAccess?.clusters } });

		// if none of the above conditions -> filter normally
		if (includePublicFilter.$or.length === 0) includePublicFilter = filter;

		// console.log("includePublicFilter :>> ", includePublicFilter);
		return super.find(includePublicFilter, options, pagination);
	}
}
