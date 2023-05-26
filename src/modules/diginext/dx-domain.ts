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

export async function createDxDomain(params: CreateDiginextDomainParams, dxKey: string) {
	return dxApi<CreateDiginextDomainResponse>({ url: "/domains/create", data: params, method: "POST", dxKey });
}
