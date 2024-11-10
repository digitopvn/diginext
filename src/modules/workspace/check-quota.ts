import { toNumber } from "lodash";

import { IsSuperAccount, IsTest } from "@/app.config";
import type { IWorkspace } from "@/entities";
import type { ResourceQuotaSize } from "@/interfaces/SystemTypes";
import { AppService } from "@/services/AppService";
import { BuildService } from "@/services/BuildService";
import { ProjectService } from "@/services/ProjectService";
import { WorkspaceService } from "@/services/WorkspaceService";

import type { CheckQuotaParams, CheckQuotaResponse } from "../diginext/dx-subscription";
import { dxCheckQuota } from "../diginext/dx-subscription";

export async function checkQuota(workspace: IWorkspace, options: { resourceSize?: ResourceQuotaSize; isDebugging?: boolean } = {}) {
	// SKIP on development and test environment
	if (IsTest() || IsSuperAccount(workspace.slug)) return { status: 1, data: { isExceed: false }, messages: ["Ok"] } as CheckQuotaResponse;

	const { dx_key } = workspace;
	const { resourceSize } = options;

	const projectSvc = new ProjectService();
	const appSvc = new AppService();
	const buildSvc = new BuildService();

	const projects = await projectSvc.count({ workspace: workspace._id });
	const apps = await appSvc.count({ workspace: workspace._id });
	const concurrentBuilds = await buildSvc.count({ status: "building", workspace: workspace._id });

	let containerSize: number;
	if (resourceSize) containerSize = resourceSize === "none" ? 0 : toNumber(resourceSize.substring(0, resourceSize.length - 1));

	const checkQuotaParams: CheckQuotaParams = { projects, apps, concurrentBuilds, containerSize };
	if (options?.isDebugging) console.log("checkQuota > checkQuotaParams :>> ", checkQuotaParams);

	const res = await dxCheckQuota(checkQuotaParams, dx_key);
	if (options?.isDebugging) console.log("checkQuota > res :>> ", res);
	return res;
}

export async function checkQuotaByWorkspaceId(id: string) {
	const workspaceSvc = new WorkspaceService();
	const workspace = await workspaceSvc.findOne({ _id: id });
	if (!workspace) throw new Error(`Workspace not found`);

	return checkQuota(workspace);
}
