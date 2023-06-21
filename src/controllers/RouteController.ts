import type { ObjectId } from "mongodb";
import { Body, Get, Post, Queries, Route, Security, Tags } from "tsoa/dist";

import type { IRole } from "@/entities";
import type { IRoute } from "@/entities/Route";
import type { IRoutePermission } from "@/interfaces";
import * as interfaces from "@/interfaces";
import type { DBCollection } from "@/modules/api/DB";
import { DB } from "@/modules/api/DB";
import { MongoDB } from "@/plugins/mongodb";
import RouteService from "@/services/RouteService";

import BaseController from "./BaseController";

@Tags("Route")
@Route("route")
export default class RouteController extends BaseController<IRoute> {
	constructor() {
		super(new RouteService());
	}

	/**
	 * Get all routes
	 */
	@Security("api_key")
	@Security("jwt")
	@Get("/")
	async read(@Queries() queryParams?: interfaces.IGetQueryParams) {
		const res = await super.read();
		// console.log("res :>> ", res);
		return res;
	}

	/**
	 * Check access permissions
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/permission")
	async checkPermissions(@Body() body: { action: IRoutePermission; route: string; itemId?: ObjectId }) {
		if (!body.route) return interfaces.respondFailure(`Param "route" is required.`);
		if (!body.action) return interfaces.respondFailure(`Param "action" is required.`);

		let { route, action, itemId } = body;

		if (route !== "*" && route.indexOf("/api/v1") < 0) return interfaces.respondFailure(`Param "route" is invalid.`);

		let item;
		if (itemId && route.indexOf("/api/v1/") > -1) {
			const collection = route.replace("/api/v1/", "") as DBCollection;
			item = await DB.findOne(collection, { _id: itemId });
		}
		// console.log("item :>> ", item);

		let allowScope: "none" | "full" | "own" = "none";
		let isAllowed = false;

		const activeRole = this.user.activeRole as IRole;

		// check wildcard route first...
		let routeRole = activeRole.routes.find((_route) => _route.route === "*");
		if (routeRole) {
			if (routeRole.permissions.includes(action)) {
				allowScope = "full";
				isAllowed = true;
			} else {
				// if permisions have "own" -> only have access to items which "owner" is "userID":
				if (routeRole.permissions.includes("full")) {
					allowScope = "full";
					isAllowed = true;
				} else if (routeRole.permissions.includes("own")) {
					allowScope = "own";
					if (item) {
						isAllowed = MongoDB.toString(item.owner) === MongoDB.toString(this.user._id);
					} else {
						isAllowed = true;
					}
				}
			}
		}

		// ...then check the exact route
		routeRole = activeRole.routes.find((_route) => _route.route === route);
		if (routeRole) {
			if (routeRole.permissions.includes(action)) {
				allowScope = "full";
				isAllowed = true;
			} else {
				// if permisions have "own" -> only have access to items which "owner" is "userID":
				if (routeRole.permissions.includes("full")) {
					allowScope = "full";
					isAllowed = true;
				} else if (routeRole.permissions.includes("own")) {
					allowScope = "own";
					if (item) {
						isAllowed = MongoDB.toString(item.owner) === MongoDB.toString(this.user._id);
					} else {
						isAllowed = true;
					}
				}
			}
		}

		let explain =
			allowScope === "full"
				? "You have the full permissions in this route."
				: allowScope === "own"
				? "You only have full permissions to items which you created."
				: "You don't have any permissions in this route";

		if (item && allowScope === "own" && !isAllowed) explain = `You don't have permissions to ${action} this item.`;

		if (allowScope !== "none") {
			return interfaces.respondSuccess({ data: { allowed: isAllowed, scope: allowScope, explain } });
		} else {
			return interfaces.respondFailure({ data: { allowed: isAllowed, scope: allowScope, explain } });
		}
	}
}
