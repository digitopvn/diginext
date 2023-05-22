import { toNumber } from "lodash";

import type { IWorkspace } from "@/entities";
import type { ResourceQuotaSize } from "@/interfaces/SystemTypes";

import { DB } from "../api/DB";
import { checkDxQuota } from "../diginext/dx-subscription";

export async function checkQuota(workspace: IWorkspace, options: { resourceSize?: ResourceQuotaSize } = {}) {
	const { dx_key } = workspace;
	const { resourceSize } = options;

	const projects = await DB.count("app");
	const apps = await DB.count("app");
	const concurrentBuilds = await DB.count("build", { status: "building" });

	let containerSize: number;
	if (resourceSize) {
		containerSize = resourceSize === "none" ? 0 : toNumber(resourceSize.substring(0, resourceSize.length - 1));
	}

	const res = await checkDxQuota({ projects, apps, concurrentBuilds, containerSize }, dx_key);
	return res;
}

export async function checkQuotaByWorkspaceId(id: string) {
	const workspace = await DB.findOne("workspace", { _id: id });
	if (!workspace) throw new Error(`Workspace not found`);

	return checkQuota(workspace);
}
