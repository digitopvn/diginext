import Route from "@/entities/Route";

import BaseService from "./BaseService";

export default class RouteService extends BaseService<Route> {
	constructor() {
		super(Route);
	}
}

export { RouteService };
