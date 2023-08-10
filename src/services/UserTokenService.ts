import type { IUserToken } from "@/entities/UserToken";
import { userTokenSchema } from "@/entities/UserToken";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export class UserTokenService extends BaseService<IUserToken> {
	constructor(ownership?: Ownership) {
		super(userTokenSchema, ownership);
	}
}
