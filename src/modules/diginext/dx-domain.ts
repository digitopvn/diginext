import type { ResponseData } from "@/interfaces";

import { dxApi } from "./dx-api";

type CreateDiginextDomainParams = {
	/**
	 * Subdomain name
	 * @example myworkspace, yourworkspace, ourteam
	 */
	name: string;
	data: string;
};

type CreateDiginextDomainResponse = ResponseData & {
	data: { domain: string; domain_record: string };
};

export async function createDiginextDomain(params: CreateDiginextDomainParams) {
	return dxApi<CreateDiginextDomainResponse>({ url: "/domains/create", data: params, method: "POST" });
}
