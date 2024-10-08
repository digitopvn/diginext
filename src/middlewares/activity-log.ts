import { isJSON } from "class-validator";
import type { NextFunction } from "express";
import { isEmpty } from "lodash";

import { Config } from "@/app.config";
import type { IWorkspace } from "@/entities";
import type { IActivity } from "@/entities/Activity";
import type { AppRequest, AppResponse } from "@/interfaces/SystemTypes";
import ActivityService from "@/services/ActivityService";

export const saveActivityLog = async (req: AppRequest, res: AppResponse, next: NextFunction) => {
	const { DB } = await import("@/modules/api/DB");
	// Only save log for POST, PATCH & DELETE
	// if (req.method === "GET") return next();

	const { user, workspace, ownership } = req;
	// console.log("saveActivityLog > body :>> ", res.body);
	// console.log("user :>> ", user);
	// console.log('role :>> ', role);

	if (user) {
		// parse & create activity dto:
		const activityDto = {} as IActivity;
		activityDto.owner = user._id;
		activityDto.workspace = !isEmpty(workspace) ? workspace : (user.activeWorkspace as IWorkspace);
		if (isEmpty(activityDto.workspace)) delete activityDto.workspace;

		activityDto.name = user.name;
		activityDto.query = req.query;
		activityDto.method = req.method;
		activityDto.responseStatus = isJSON(res.body) ? JSON.parse(res.body).status : undefined;
		activityDto.httpStatus = req.statusCode;
		// activityDto.response = res.body;

		try {
			const url = new URL(`${Config.BASE_URL}${req.originalUrl}`);
			const route = await DB.findOne("route", { path: url.pathname }, { ignorable: true });
			activityDto.url = req.originalUrl;
			activityDto.route = req.path;
			activityDto.routeName = route?.name;
		} catch (e) {
			console.error(e);
		}

		// write activity log to database:
		const activitySvc = new ActivityService(ownership);
		const activity = await activitySvc.create(activityDto);
		// console.log("Saved activity info :>> ", activity._id);
	}

	// next();
};
