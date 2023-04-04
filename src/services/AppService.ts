import App from "@/entities/App";

import BaseService from "./BaseService";

export default class AppService extends BaseService<App> {
	constructor() {
		super(App);
	}
}

// export { AppService };
