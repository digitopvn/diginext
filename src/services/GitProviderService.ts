import type { GitProviderDto, IGitProvider } from "@/entities/GitProvider";
import { gitProviderSchema } from "@/entities/GitProvider";
import GitProviderAPI from "@/modules/git/git-provider-api";

import BaseService from "./BaseService";

export default class GitProviderService extends BaseService<IGitProvider> {
	constructor() {
		super(gitProviderSchema);
	}

	async verify(provider: IGitProvider) {
		// process
		// console.log("GitProviderService > provider :>> ", provider);
		const profile = await GitProviderAPI.getProfile(provider);
		// console.log("profile :>> ", profile);

		if (profile.username) {
			// mark this git provider as verified
			const updateDto: GitProviderDto = { verified: true };
			if (provider.type === "bitbucket") updateDto.bitbucket_oauth = { verified: true };
			if (provider.type === "github") updateDto.github_oauth = { verified: true };

			return this.updateOne({ _id: provider._id }, updateDto);
		}

		throw new Error(`Unable to verify "${provider.name}" git provider.`);
	}
}
export { GitProviderService };
