import type { ResponseData } from "@/interfaces";

import { dxApi } from "./dx-api";

export type CheckQuotaParams = {
	projects: number;
	apps: number;
	concurrentBuilds: number;
	containerSize: number;
};

export type CheckQuotaResponse = ResponseData & {
	data: { isExceed: boolean };
};

export async function checkDxQuota(params: CheckQuotaParams, dxKey: string) {
	return dxApi<CheckQuotaResponse>({ url: "/subscriptions/quota/check", data: params, method: "POST", dxKey });
}
