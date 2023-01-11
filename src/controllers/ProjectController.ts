import type { NextFunction, Request, Response } from "express";

import type { Project } from "@/entities";
import AppService from "@/services/AppService";
import ProjectService from "@/services/ProjectService";

import BaseController from "./BaseController";

export default class ProjectController extends BaseController<ProjectService> {
	constructor() {
		super(new ProjectService());
	}

	async getProjectsAndApps(req: Request, res: Response, next: NextFunction) {
		let projects = await this.service.find(this.filter, this.options, this.pagination);

		let result: any = { status: 1, data: projects };
		if (this.pagination) result = { ...result, ...this.pagination };

		// assign refreshed token if any:
		// TODO: this is not safe -> should use refresh token!
		const { token } = req as any;
		if (token) result.token = token;

		// populate apps
		const projectIDs = projects.map((p) => p._id);
		// console.log("projectIDs :>> ", projectIDs);

		const appSvc = new AppService();
		let apps = await appSvc.find({ project: { $in: projectIDs } }, this.options);
		// console.log("apps :>> ", apps);

		const projectsWithApps = projects.map((p) => {
			const projectWithApps: Project & { apps?: any[] } = p;
			projectWithApps.apps = apps.filter((a) => a.project.toString() === p._id.toString());
			return projectWithApps;
		});

		result.data = projectsWithApps;
		return res.status(200).json(result);
	}
}
