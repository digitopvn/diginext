import { Body, Delete, Get, Patch, Post, Queries, Route, Tags } from "tsoa/dist";

import type { Project } from "@/entities";
import type { HiddenBodyKeys } from "@/interfaces";
import { IDeleteQueryParams, IGetQueryParams, IPostQueryParams } from "@/interfaces";
import type { ResponseData } from "@/interfaces/ResponseData";
import AppService from "@/services/AppService";
import ProjectService from "@/services/ProjectService";

import BaseController from "./BaseController";

@Tags("Project")
@Route("project")
export default class ProjectController extends BaseController<Project> {
	constructor() {
		super(new ProjectService());
	}

	@Get("/")
	read(@Queries() queryParams?: IGetQueryParams) {
		return super.read();
	}

	@Post("/")
	create(@Body() body: Omit<Project, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.create(body);
	}

	@Patch("/")
	update(@Body() body: Omit<Project, keyof HiddenBodyKeys>, @Queries() queryParams?: IPostQueryParams) {
		return super.update(body);
	}

	@Delete("/")
	delete(@Queries() queryParams?: IDeleteQueryParams) {
		return super.delete();
	}

	@Get("/with-apps")
	async getProjectsAndApps(@Queries() queryParams?: IGetQueryParams) {
		let projects = await this.service.find(this.filter, this.options, this.pagination);

		let result: ResponseData & { data: Project[] } = { status: 1, data: [], messages: [] };
		if (this.pagination) result = { ...result, ...this.pagination };

		// // assign refreshed token if any:
		// // TODO: this is not safe -> should use refresh token!
		// const { token } = req as any;
		// if (token) result.token = token;

		// populate apps
		const projectIDs = projects.map((p) => p._id);
		// console.log("projectIDs :>> ", projectIDs);

		const appSvc = new AppService();
		let apps = await appSvc.find({ project: { $in: projectIDs } }, this.options);
		// console.log("apps :>> ", apps);

		result.data = projects.map((p) => {
			const projectWithApps: Project = { ...p };
			projectWithApps.apps = apps.filter((a) => a.project.toString() === p._id.toString());
			return projectWithApps;
		});

		return result;

		// result.data = projectsWithApps;
		// return res.status(200).json(result);
		// return projectsWithApps;
		// return projectsWithApps;
	}
}
