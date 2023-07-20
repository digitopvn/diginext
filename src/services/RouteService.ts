import type { IRoute } from "@/entities/Route";
import { routeSchema } from "@/entities/Route";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export class RouteService extends BaseService<IRoute> {
	constructor(ownership?: Ownership) {
		super(routeSchema, ownership);
	}
}
