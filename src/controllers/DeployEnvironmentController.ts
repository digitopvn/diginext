import type { NextFunction } from "express-serve-static-core";
import { Get, Queries, Route, Security, Tags } from "tsoa/dist";

import type { IUser, IWorkspace } from "@/entities";
import { type IQueryFilter, type IQueryOptions, type IResponsePagination, respondFailure, respondSuccess } from "@/interfaces";
import type { AppRequest, Ownership } from "@/interfaces/SystemTypes";
import { parseFilterAndOptions } from "@/plugins/controller-parser";
// import { DeployEnvironmentService } from "@/services/DeployEnvironmentService";

@Tags("DeployEnvironment")
@Route("deploy-environment")
export default class DeployEnvironmentController {
	req: AppRequest;

	user: IUser;

	workspace: IWorkspace;

	ownership: Ownership;

	// service: DeployEnvironmentService;

	filter: IQueryFilter;

	options: IQueryOptions;

	pagination: IResponsePagination;

	/**
	 * Parse the filter & option from the URL
	 */
	parseFilter(req: AppRequest, res?: Response, next?: NextFunction) {
		const parsed = parseFilterAndOptions(req);

		// assign to controller:
		this.options = parsed.options;
		this.filter = parsed.filter;

		if (next) next();
	}

	/**
	 * Get list of deploy environments
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/deploy-environment")
	async getDeployEnvironments(
		@Queries()
		queryParams: {
			env?: string;
			appSlug?: string;
			projectSlug?: string;
		}
	) {
		try {
			const { DeployEnvironmentService } = await import("@/services/DeployEnvironmentService");
			const svc = new DeployEnvironmentService(this.ownership);

			const { data, pagination } = await svc.listDeployEnvironments(this.filter, this.options);
			return respondSuccess({
				data,
				current_page: pagination.page,
				total_pages: pagination.total,
				total_items: pagination.total,
				page_size: pagination.size,
			});
		} catch (e) {
			console.error(e);
			return respondFailure(`Unable to get deploy environments: ${e}`);
		}
	}
}
