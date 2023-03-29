import { Column, Entity } from "@/libs/typeorm";

import User from "./User";

@Entity({ name: "api_key" })
export default class ApiKeyAccount extends User {
	/**
	 * Service Account is also a User with unexpired access token.
	 */
	@Column({ default: "api_key" })
	type?: string;

	constructor(data?: ApiKeyAccount | any) {
		super();
		Object.assign(this, data);
	}
}

export { ApiKeyAccount };
