import { IsTest } from "@/app.config";
import { DIGINEXT_DOMAIN } from "@/config/const";
import type { ResponseData } from "@/interfaces";

import { dxApi } from "./dx-api";

export type CreateDiginextDomainParams = {
	/**
	 * Subdomain name
	 * @example myworkspace, yourworkspace, ourteam
	 */
	name: string;
	data: string;
};

export type CreateDiginextDomainResponse = ResponseData & {
	data: { domain: string; domain_record: string };
};

export async function dxCreateDomain(params: CreateDiginextDomainParams, dxKey: string) {
	if (IsTest()) return { status: 1, data: { domain: `${params.name}.${DIGINEXT_DOMAIN}`, domain_record: "" } } as CreateDiginextDomainResponse;
	return dxApi<CreateDiginextDomainResponse>({ url: "/domains/create", data: params, method: "POST", dxKey });
}
