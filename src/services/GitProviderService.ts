import GitProvider from "@/entities/GitProvider";

import BaseService from "./BaseService";

export default class GitProviderService extends BaseService<GitProvider> {
	constructor() {
		super(GitProvider);
	}
}
export { GitProviderService };
