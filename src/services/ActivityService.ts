import type { IActivity } from "@/entities/Activity";
import { activitySchema } from "@/entities/Activity";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export default class ActivityService extends BaseService<IActivity> {
	constructor(ownership?: Ownership) {
		super(activitySchema, ownership);
	}
}
