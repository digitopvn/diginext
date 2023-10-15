import { toNumber } from "lodash";

import { IsDev, IsTest } from "@/app.config";
import type { IWorkspace } from "@/entities";
import type { ResourceQuotaSize } from "@/interfaces/SystemTypes";

import type { CheckQuotaParams, CheckQuotaResponse } from "../diginext/dx-subscription";
import { dxCheckQuota } from "../diginext/dx-subscription";

export async function checkQuota(workspace: IWorkspace, options: { resourceSize?: ResourceQuotaSize } = {}) {
	const { DB } = await import("../api/DB");

	// SKIP on development and test environment
	if (IsTest() || IsDev()) return { status: 1, data: { isExceed: false }, messages: ["Ok"] } as CheckQuotaResponse;

	const { dx_key } = workspace;
	const { resourceSize } = options;

	const projects = await DB.count("project", { workspace: workspace._id });
	const apps = await DB.count("app", { workspace: workspace._id });
	const concurrentBuilds = await DB.count("build", { status: "building", workspace: workspace._id });

	let containerSize: number;
	if (resourceSize) containerSize = resourceSize === "none" ? 0 : toNumber(resourceSize.substring(0, resourceSize.length - 1));

	const checkQuotaParams: CheckQuotaParams = { projects, apps, concurrentBuilds, containerSize };
	console.log("checkQuota > checkQuotaParams :>> ", checkQuotaParams);

	const res = await dxCheckQuota(checkQuotaParams, dx_key);
	console.log("checkQuota > res :>> ", res);
	return res;
}

export async function checkQuotaByWorkspaceId(id: string) {
	const { DB } = await import("../api/DB");

	const workspace = await DB.findOne("workspace", { _id: id });
	if (!workspace) throw new Error(`Workspace not found`);

	return checkQuota(workspace);
}
