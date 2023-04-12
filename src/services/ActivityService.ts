import Activity from "@/entities/Activity";

import BaseService from "./BaseService";

export default class ActivityService extends BaseService<Activity> {
	constructor() {
		super(Activity);
	}
}

// export { AppService };
