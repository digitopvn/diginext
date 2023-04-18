import type { IGitProvider } from "@/entities/GitProvider";
import { gitProviderSchema } from "@/entities/GitProvider";

import BaseService from "./BaseService";

export default class GitProviderService extends BaseService<IGitProvider> {
	constructor() {
		super(gitProviderSchema);
	}
}
export { GitProviderService };
