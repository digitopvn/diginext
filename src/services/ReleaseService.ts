import type { IRelease } from "@/entities";
import { releaseSchema } from "@/entities";

import BaseService from "./BaseService";

export default class ReleaseService extends BaseService<IRelease> {
	constructor() {
		super(releaseSchema);
	}
}
export { ReleaseService };
