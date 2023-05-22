import { toNumber } from "lodash";

import type { IWorkspace } from "@/entities";
import type { ResourceQuotaSize } from "@/interfaces/SystemTypes";

import { DB } from "../api/DB";
import type { CheckQuotaParams } from "../diginext/dx-subscription";
import { checkDxQuota } from "../diginext/dx-subscription";

export async function checkQuota(workspace: IWorkspace, options: { resourceSize?: ResourceQuotaSize } = {}) {
	const { dx_key } = workspace;
	const { resourceSize } = options;

	const projects = await DB.count("project", { workspace: workspace._id });
	const apps = await DB.count("app", { workspace: workspace._id });
	const concurrentBuilds = await DB.count("build", { status: "building", workspace: workspace._id });

	let containerSize: number;
	if (resourceSize) containerSize = resourceSize === "none" ? 0 : toNumber(resourceSize.substring(0, resourceSize.length - 1));

	const checkQuotaParams: CheckQuotaParams = { projects, apps, concurrentBuilds, containerSize };
	console.log("checkQuota > checkQuotaParams :>> ", checkQuotaParams);
	const res = await checkDxQuota(checkQuotaParams, dx_key);
	console.log("checkQuota > res :>> ", res);
	return res;
}

export async function checkQuotaByWorkspaceId(id: string) {
	const workspace = await DB.findOne("workspace", { _id: id });
	if (!workspace) throw new Error(`Workspace not found`);

	return checkQuota(workspace);
}
