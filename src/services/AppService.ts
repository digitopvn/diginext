import type { IApp } from "@/entities/App";
import { appSchema } from "@/entities/App";

import BaseService from "./BaseService";

export default class AppService extends BaseService<IApp> {
	constructor() {
		super(appSchema);
	}
}

// export { AppService };
