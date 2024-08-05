import path from "path";

import { Config } from "@/app.config";
import { CLI_CONFIG_DIR } from "@/config/const";
import type { IBuild } from "@/entities/Build";
import { buildSchema } from "@/entities/Build";
import type { IQueryFilter, IQueryOptions, IQueryPagination } from "@/interfaces";
import type { BuildStatus, DeployStatus, Ownership } from "@/interfaces/SystemTypes";
import type { RerunBuildParams, StartBuildParams } from "@/modules/build";
import { generateBuildTagBySourceDir } from "@/modules/build/generate-build-tag";
import { checkQuota } from "@/modules/workspace/check-quota";

import BaseService from "./BaseService";
import { ContainerRegistryService } from "./ContainerRegistryService";

export class BuildService extends BaseService<IBuild> {
	regSvc: ContainerRegistryService;

	constructor(ownership?: Ownership) {
		super(buildSchema, ownership);
		this.regSvc = new ContainerRegistryService(ownership);
	}

	async find(filter?: IQueryFilter<IBuild>, options?: IQueryOptions & IQueryPagination, pagination?: IQueryPagination): Promise<IBuild[]> {
		if (this.user?.allowAccess?.projects?.length > 0) {
			if (filter.$or) {
				filter.$or.push({ project: { $in: this.user?.allowAccess?.projects } });
			} else {
				filter = { $or: [filter, { project: { $in: this.user?.allowAccess?.projects } }] };
			}
		}
		if (this.user?.allowAccess?.apps?.length > 0) {
			if (filter.$or) {
				filter.$or.push({ app: { $in: this.user?.allowAccess?.apps } });
			} else {
				filter = { $or: [filter, { project: { $in: this.user?.allowAccess?.apps } }] };
			}
		}

		// options.isDebugging = true;
		return super.find(filter, options, pagination);
	}

	async startBuild(data: StartBuildParams, ownership: Ownership) {
		// check dx quota
		const quotaRes = await checkQuota(ownership.workspace);
		if (!quotaRes.status) throw new Error(quotaRes.messages.join(". "));
		if (quotaRes.data && quotaRes.data.isExceed) throw new Error(`You've exceeded the limit amount of concurrent builds.`);

		// default values
		if (ownership.owner) data.user = ownership.owner;

		// validates
		const { appSlug, user, userId, gitBranch, registrySlug } = data;
		if (!appSlug) throw new Error(`App slug is required.`);
		if (!user && !userId) throw new Error(`User or UserID is required.`);
		if (!gitBranch) throw new Error(`Git branch is required.`);
		if (!registrySlug) throw new Error(`Container registry slug is required.`);

		// app build directory
		if (!data.buildTag) {
			const { DB } = await import("@/modules/api/DB");
			const app = await DB.findOne("app", { slug: appSlug }, { ownership: this.ownership });
			const projectSlug = app?.projectSlug;
			const SOURCE_CODE_DIR = `cache/${projectSlug}/${appSlug}/${gitBranch}`;
			const buildDir = path.resolve(CLI_CONFIG_DIR, SOURCE_CODE_DIR);
			const tagInfo = await generateBuildTagBySourceDir(buildDir, { branch: gitBranch });
			data.buildTag = tagInfo.tag;
		}

		// start the build
		const buildModule = await import("@/modules/build");
		const buildInfo = await buildModule.startBuild(data);
		const logURL = `${Config.BASE_URL}/build/logs?build_slug=${buildInfo.SOCKET_ROOM}`;

		return { logURL, ...buildInfo };
	}

	async stopBuild(slug: string, buildStatus: BuildStatus, deployStatus: DeployStatus = "pending") {
		// const { slug } = data;
		// console.log("slug :>> ", slug);
		// return ApiResponse.failed(res, `${slug}`);

		if (!slug) throw new Error(`Build "slug" is required.`);

		let build = await this.findOne({ slug });
		if (!build) throw new Error(`Build "${slug}" not found.`);

		const buildModule = await import("@/modules/build");
		const stoppedBuild = await buildModule.stopBuild(build.projectSlug, build.appSlug, slug.toString(), buildStatus, deployStatus);
		if ((stoppedBuild as { error: string })?.error) throw new Error((stoppedBuild as { error: string }).error);

		return stoppedBuild;
	}

	async rerunBuild(build: IBuild, options: RerunBuildParams, ownership?: Ownership) {
		// validate
		const { appSlug, tag: prevBuildNumber, branch: gitBranch, registry: registryID, status } = build;
		if (!appSlug) throw new Error(`App slug is required.`);
		if (!gitBranch) throw new Error(`Git branch is required.`);
		if (!registryID) throw new Error(`Container registry ID is required.`);

		// find registry
		const registry = await this.regSvc.findOne({ _id: registryID });
		if (!registry) throw new Error(`Container registry not found.`);

		// build params
		const buildParams: StartBuildParams = {
			appSlug,
			gitBranch,
			registrySlug: registry.slug,
		};

		return this.startBuild(buildParams, ownership);
	}
}
