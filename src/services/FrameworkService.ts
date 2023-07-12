import path from "path";

import { CLI_CONFIG_DIR } from "@/config/const";
import type { FrameworkDto, IFramework } from "@/entities/Framework";
import { frameworkSchema } from "@/entities/Framework";
import { type IQueryOptions } from "@/interfaces";
import { DB } from "@/modules/api/DB";
import { pullOrCloneGitRepo } from "@/plugins";
import { makeSlug } from "@/plugins/slug";

import BaseService from "./BaseService";

export class FrameworkService extends BaseService<IFramework> {
	constructor() {
		super(frameworkSchema);
	}

	async create(data: FrameworkDto, options?: IQueryOptions) {
		console.log("data :>> ", data);
		// validate
		const requiredFields: string[] = [];
		if (!data.name) requiredFields.push("name");
		if (!data.repoURL) requiredFields.push("repoURL");
		if (!data.repoSSH) requiredFields.push("repoSSH");
		if (!data.gitProvider) requiredFields.push("gitProvider");
		if (!data.mainBranch) requiredFields.push("mainBranch");
		if (requiredFields.length > 0) throw new Error(`Required params: ${requiredFields.join(", ")}.`);

		// check if workspace is able to pull
		const availableGitProviders = await DB.find("git", { type: data.gitProvider });
		const slug = makeSlug(data.name);

		let workspace = this.req?.workspace;
		if (!workspace && (data as any).workspace) workspace = await DB.findOne("workspace", { _id: (data as any).workspace });
		if (!workspace) throw new Error(`Workspace not found.`);

		const frameworkDir = path.resolve(CLI_CONFIG_DIR, `${workspace.slug}/frameworks/${slug}/${data.mainBranch}`);

		try {
			for (const gitProvider of availableGitProviders) {
				const successClone = await pullOrCloneGitRepo(data.repoSSH, frameworkDir, data.mainBranch, {
					useAccessToken: { type: gitProvider.method === "basic" ? "Basic" : "Bearer", value: gitProvider.access_token },
				});
				if (successClone) break;
			}
		} catch (e) {
			throw new Error(`Workspace is unable to clone/pull this framework's git repo.`);
		}

		// create
		const item = await super.create(data, options);
		return item;
	}
}
