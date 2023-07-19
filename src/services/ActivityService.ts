import type { IActivity } from "@/entities/Activity";
import { activitySchema } from "@/entities/Activity";

import BaseService from "./BaseService";

export default class ActivityService extends BaseService<IActivity> {
	constructor() {
		super(activitySchema);
	}
}
