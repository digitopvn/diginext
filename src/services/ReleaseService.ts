import type { IRelease } from "@/entities";
import { releaseSchema } from "@/entities";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export class ReleaseService extends BaseService<IRelease> {
	constructor(ownership?: Ownership) {
		super(releaseSchema, ownership);
	}
}
