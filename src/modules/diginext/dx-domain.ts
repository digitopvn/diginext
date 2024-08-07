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
	/**
	 * DXSITE User ID
	 */
	userId: string;
};

export type UpdateDiginextDomainParams = {
	/**
	 * Subdomain name
	 * @example myworkspace, yourworkspace, ourteam
	 */
	subdomain: string;
	/**
	 * Value of "A" record
	 * @example 192.168.127.12
	 */
	data: string;
	/**
	 * DXSITE User ID
	 */
	userId: string;
};

export type CreateDiginextDomainResponse = ResponseData & {
	data: { domain: string; domain_record: string };
};

export type UpdateDiginextDomainResponse = ResponseData & {
	data: {
		id: string;
		/**
		 * Subdomain name
		 * @example myworkspace, yourworkspace, ourteam
		 */
		name: string;
		/**
		 * Record type (A, TXT, CNAME, MX,...)
		 */
		type: string;
		/**
		 * Value of "A" record
		 * @example 192.168.127.12
		 */
		data: string;
	};
};

export async function dxCreateDomain(params: CreateDiginextDomainParams, dxKey: string, options?: { isDebugging?: boolean }) {
	if (IsTest()) return { status: 1, data: { domain: `${params.name}.${DIGINEXT_DOMAIN}`, domain_record: "" } } as CreateDiginextDomainResponse;
	return dxApi<CreateDiginextDomainResponse>({ url: "/domains/create", data: params, method: "POST", dxKey, isDebugging: options?.isDebugging });
}

export async function dxUpdateDomain(params: UpdateDiginextDomainParams, dxKey: string, options?: { isDebugging?: boolean }) {
	if (IsTest()) return { status: 1, data: { domain: `${params.subdomain}.${DIGINEXT_DOMAIN}`, domain_record: "" } } as CreateDiginextDomainResponse;
	return dxApi<UpdateDiginextDomainResponse>({ url: "/domains", data: params, method: "PATCH", dxKey, isDebugging: options?.isDebugging });
}
