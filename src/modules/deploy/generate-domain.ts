import { randomStringByLength } from "diginext-utils/dist/string/random";
import { logError } from "diginext-utils/dist/xconsole/log";

import { isServerMode } from "@/app.config";
import { DIGINEXT_DOMAIN } from "@/config/const";
import type { IUser, IWorkspace } from "@/entities";

import { fetchApi } from "../api";
import type { CreateDiginextDomainParams } from "../diginext/dx-domain";
import { dxCreateDomain } from "../diginext/dx-domain";

export interface GenerateDomainOptions {
	/**
	 * User data
	 */
	user: IUser;
	/**
	 * Workspace data
	 */
	workspace: IWorkspace;
	/**
	 * Subdomain name
	 */
	recordName: string;
	/**
	 * @default "diginext.site"
	 */
	primaryDomain?: string;
	/**
	 * Value of A RECORD
	 */
	ipAddress?: string;
	/**
	 * If cluster's short name is specify, IP address will be ignored and
	 * the primary IP address of the cluster will be used as the A RECORD value
	 */
	clusterSlug?: string;
	/**
	 * Debugging mode
	 */
	isDebugging?: boolean;
}

interface GenerateDomainResult {
	status: number;
	domain: string;
	ip?: string;
	messages: string[];
}

export const generateDomains = async (params: GenerateDomainOptions) => {
	const { DB } = await import("../api/DB");

	if (params.isDebugging) console.log("generateDomains() > params :>> ", params);

	// Manage domains in database to avoid duplication
	const dxKey = params.workspace.dx_key;

	let { recordName, clusterSlug, ipAddress, primaryDomain = DIGINEXT_DOMAIN, user } = params;
	let domain = `${recordName}.${primaryDomain}`;
	let targetIP: string;

	if (clusterSlug) {
		const cluster = await DB.findOne("cluster", { slug: clusterSlug }, { subpath: "/all" });
		if (!cluster) {
			logError(`Cluster "${clusterSlug}" not found.`);
			return { status: 0, domain, ip: null, messages: [`Cluster "${clusterSlug}" not found.`] } as GenerateDomainResult;
		}
		targetIP = cluster.primaryIP;
	}

	if (!targetIP) {
		if (!ipAddress) {
			logError(`Failed to generate domain: "ipAddress" is required.`);
			return { status: 0, messages: [`Failed to generate domain: "clusterSlug" or "ipAddress" is required.`] } as GenerateDomainResult;
		} else {
			targetIP = ipAddress;
		}
	}

	// create new subdomain:
	const domainData: CreateDiginextDomainParams = { name: recordName, data: targetIP, userId: user.dxUserId };
	let res = isServerMode ? await dxCreateDomain(domainData, dxKey) : await fetchApi({ url: `/api/v1/domain`, method: "POST", data: domainData });

	if (params.isDebugging) console.log("generateDomains() > res :>> ", res);
	let { status, messages } = res;

	if (status === 0) {
		const [msg = ""] = messages;
		if (msg.indexOf("domain name is existed")) {
			const randomStr = randomStringByLength(6, "zxcvbnmasdfghjklqwertyuiop1234567890");
			recordName = `${randomStr}-${recordName}`;
			domain = `${recordName}.${primaryDomain}`;

			// create new domain again if domain was existed
			res = await dxCreateDomain({ name: recordName, data: targetIP, userId: user.dxUserId }, dxKey);

			messages = [`Domain was existed, so a new one was generated: ${domain}`];
			status = res.status;

			if (status === 1) return { status: 1, domain, ip: targetIP, messages } as GenerateDomainResult;
		}

		if (msg) logError(`[DOMAIN] ${msg}`);
		return { status: 0, domain, ip: null, messages } as GenerateDomainResult;
	}

	return { status: 1, domain, ip: targetIP, messages: [] } as GenerateDomainResult;
};
