import { Body, Delete, Get, Patch, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { IProject } from "@/entities";
import { ProjectDto } from "@/entities";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import { respondFailure, respondSuccess } from "@/interfaces/ResponseData";
import { checkQuota } from "@/modules/workspace/check-quota";
import { MongoDB } from "@/plugins/mongodb";
import AppService from "@/services/AppService";
import ProjectService from "@/services/ProjectService";

import BaseController from "./BaseController";

@Tags("Project")
@Route("project")
export default class ProjectController extends BaseController<IProject> {
	service: ProjectService;

	constructor() {
		super(new ProjectService());
	}

	/**
	 * List of projects
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/")
	async create(@Body() body: ProjectDto, @Queries() queryParams?: IPostQueryParams) {
		// check dx quota
		const quotaRes = await checkQuota(this.workspace);
		console.log("[ProjectController] quotaRes :>> ", quotaRes);
		if (!quotaRes.status) return respondFailure(quotaRes.messages.join(". "));
		if (quotaRes.data && quotaRes.data.isExceed)
			return respondFailure(
				`You've exceeded the limit amount of projects (${quotaRes.data.type} / Max. ${quotaRes.data.limits.projects} projects).`
			);

		return super.create(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Patch("/")
	update(@Body() body: ProjectDto, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Security("api_key")
	@Security("jwt")
	@Delete("/")
	async softDelete(@Queries() queryParams?: IDeleteQueryParams) {
		const result = await this.service.softDelete(this.filter);
		console.log("result :>> ", result);
		return result.ok ? respondSuccess({ data: result }) : respondFailure(`Can't delete a project.`);
	}

	@Security("api_key")
	@Security("jwt")
	@Get("/with-apps")
	async getProjectsAndApps(@Queries() queryParams?: IGetQueryParams) {
		let projects = await this.service.find(this.filter, this.options, this.pagination);

		let result: ResponseData & { data: IProject[] } = { status: 1, data: [], messages: [] };
		if (this.pagination) result = { ...result, ...this.pagination };

		// populate apps
		const projectIDs = projects.map((p) => p._id);
		const appSvc = new AppService();
		let apps = await appSvc.find({ project: { $in: projectIDs } }, this.options);
		// console.log("apps :>> ", apps);

		result.data = projects.map((p) => {
			const projectWithApps = { ...p };
			projectWithApps.apps = apps.filter((a) => MongoDB.toString(a.project) === MongoDB.toString(p._id));
			return projectWithApps;
		});

		return result;
	}
}
