import type { IRelease } from "@/entities";
import { releaseSchema } from "@/entities";

import BaseService from "./BaseService";

export class ReleaseService extends BaseService<IRelease> {
	constructor() {
		super(releaseSchema);
	}
}
