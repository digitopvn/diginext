import type { GitProviderDto, IGitProvider } from "@/entities/GitProvider";
import { gitProviderSchema } from "@/entities/GitProvider";
import type { IQueryOptions } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import GitProviderAPI from "@/modules/git/git-provider-api";

import BaseService from "./BaseService";

export class GitProviderService extends BaseService<IGitProvider> {
	constructor(ownership?: Ownership) {
		super(gitProviderSchema, ownership);
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

	async listGitRepository(provider: IGitProvider, options?: IQueryOptions) {
		return GitProviderAPI.listGitRepositories(provider, options);
	}

	async deleteGitRepository(provider: IGitProvider, slug: string, options?: IQueryOptions) {
		return GitProviderAPI.deleteGitRepository(provider, provider.org, slug, options);
	}
}
