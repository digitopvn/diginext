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

export type DiginextDomainRecordQuery = {
	/**
	 * Record name
	 */
	name: string;
	/**
	 * Record type (A, TXT, CNAME, MX,...)
	 */
	type: string;
};

export type UpdateDiginextDomainData = Partial<DiginextDomainRecordQuery> & {
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

export type GetDiginextDomainsResponse = ResponseData & {
	data: {
		domains: {
			id: string;
			name: string;
		}[];
	};
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

export type GetDiginextDomainRecordsResponse = ResponseData & {
	data: {
		records: {
			id: string;
			name: string;
			type: string;
			data: string;
		}[];
	};
};

export async function dxCreateDomain(params: CreateDiginextDomainParams, dxKey: string, options?: { isDebugging?: boolean }) {
	if (IsTest()) return { status: 1, data: { domain: `${params.name}.${DIGINEXT_DOMAIN}`, domain_record: "" } } as CreateDiginextDomainResponse;
	return dxApi<CreateDiginextDomainResponse>({ url: "/domains/create", data: params, method: "POST", dxKey, isDebugging: options?.isDebugging });
}

export async function dxGetDomains(dxKey: string, options?: { isDebugging?: boolean }) {
	if (IsTest()) return { status: 1, data: [] } as GetDiginextDomainsResponse;
	return dxApi<GetDiginextDomainsResponse>({ url: "/domains", method: "GET", dxKey, isDebugging: options?.isDebugging });
}

export async function dxGetAllDomainRecords(dxKey: string, options?: { isDebugging?: boolean }) {
	if (IsTest()) return { status: 1, data: [] } as GetDiginextDomainRecordsResponse;
	return dxApi<GetDiginextDomainRecordsResponse>({ url: `/domains/records`, method: "GET", dxKey, isDebugging: options?.isDebugging });
}

export async function dxGetDomainRecordByName(recordQuery: DiginextDomainRecordQuery, dxKey: string, options?: { isDebugging?: boolean }) {
	if (IsTest()) return { status: 1, data: [] } as GetDiginextDomainRecordsResponse;
	return dxApi<GetDiginextDomainRecordsResponse>({
		url: `/domains/records/${recordQuery.name}?type=${recordQuery.type}`,
		method: "GET",
		dxKey,
		isDebugging: options?.isDebugging,
	});
}

export async function dxUpdateDomainRecord(
	recordQuery: DiginextDomainRecordQuery,
	recordData: UpdateDiginextDomainData,
	dxKey: string,
	options?: { isDebugging?: boolean }
) {
	if (IsTest()) return { status: 1, data: { domain: `${recordData.name}.${DIGINEXT_DOMAIN}`, domain_record: "" } } as UpdateDiginextDomainResponse;
	return dxApi<UpdateDiginextDomainResponse>({
		url: `/domains/records/${recordQuery.name}?type=${recordQuery.type}`,
		data: recordData,
		method: "PATCH",
		dxKey,
		isDebugging: options?.isDebugging,
	});
}

export async function dxDeleteDomainRecord(recordQuery: DiginextDomainRecordQuery, dxKey: string, options?: { isDebugging?: boolean }) {
	if (IsTest()) return { status: 1, data: {} } as ResponseData;
	return dxApi<ResponseData>({
		url: `/domains/records/${recordQuery.name}?type=${recordQuery.type}`,
		method: "DELETE",
		dxKey,
		isDebugging: options?.isDebugging,
	});
}
