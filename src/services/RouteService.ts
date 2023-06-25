import type { IRoute } from "@/entities/Route";
import { routeSchema } from "@/entities/Route";

import BaseService from "./BaseService";

export default class RouteService extends BaseService<IRoute> {
	constructor() {
		super(routeSchema);
	}
}

export { RouteService };