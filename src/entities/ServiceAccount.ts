import { Column, Entity } from "@/libs/typeorm";

import User from "./User";

@Entity({ name: "service_account" })
export default class ServiceAccount extends User {
	/**
	 * Service Account is also a User with unexpired access token.
	 */
	@Column({ default: "service_account" })
	type?: string;

	constructor(data?: ServiceAccount | any) {
		super();
		Object.assign(this, data);
	}
}

export { ServiceAccount };
