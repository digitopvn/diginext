import type { ResponseData } from "@/interfaces";

import { dxApi } from "./dx-api";

export type CheckQuotaParams = {
	projects: number;
	apps: number;
	concurrentBuilds: number;
	containerSize: number;
};

export type DxSubsription = {
	id?: string;
	slug?: string;
	name?: string;
	paid?: number;
	currency?: string;
	key?: string;
	packageId?: string;
	packageType?: string;
	userId?: string;
	expiredAt?: string;
	createdAt?: string;
	updatedAt?: string;
};

export type CheckQuotaResponse = ResponseData & {
	data: { isExceed: boolean };
};

export async function dxCheckQuota(params: CheckQuotaParams, dxKey: string) {
	return dxApi<CheckQuotaResponse>({ url: "/subscriptions/quota/check", data: params, method: "POST", dxKey });
}
