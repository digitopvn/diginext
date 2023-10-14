import type { GitProviderDto, IGitProvider } from "@/entities/GitProvider";
import { gitProviderSchema } from "@/entities/GitProvider";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import GitProviderAPI from "@/modules/git/git-provider-api";
import { checkPermissionsByFilter } from "@/plugins/user-utils";

import BaseService from "./BaseService";

export class GitProviderService extends BaseService<IGitProvider> {
	constructor(ownership?: Ownership) {
		super(gitProviderSchema, ownership);
	}

	async find(
		filter?: IQueryFilter<IGitProvider>,
		options?: IQueryOptions & IQueryPagination,
		pagination?: IQueryPagination
	): Promise<IGitProvider[]> {
		// check access permissions
		if (this.user?.allowAccess?.gits?.length > 0) filter = { $or: [filter, { _id: { $in: this.user?.allowAccess?.gits } }] };

		return super.find(filter, options, pagination);
	}

	async update(filter: IQueryFilter<IGitProvider>, data: any, options?: IQueryOptions): Promise<IGitProvider[]> {
		// check permissions
		await checkPermissionsByFilter("gits", this, filter, this.user);

		return super.update(filter, data, options);
	}

	async updateOne(filter: IQueryFilter<IGitProvider>, data: any, options?: IQueryOptions): Promise<IGitProvider> {
		// check permissions
		await checkPermissionsByFilter("gits", this, filter, this.user);

		return super.updateOne(filter, data, options);
	}

	async delete(filter?: IQueryFilter<IGitProvider>, options?: IQueryOptions): Promise<{ ok: boolean; affected: number }> {
		// check permissions
		await checkPermissionsByFilter("gits", this, filter, this.user);

		return super.delete(filter, options);
	}

	async softDelete(filter?: IQueryFilter<IGitProvider>, options?: IQueryOptions): Promise<{ ok: boolean; affected: number }> {
		// check permissions
		await checkPermissionsByFilter("gits", this, filter, this.user);

		return super.softDelete(filter, options);
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
