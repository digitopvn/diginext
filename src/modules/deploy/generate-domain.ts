import { randomStringByLength } from "diginext-utils/dist/string/random";
import { logError } from "diginext-utils/dist/xconsole/log";

import { isServerMode } from "@/app.config";
import type { ICluster, IWorkspace } from "@/entities";

import { fetchApi } from "../api";
import { DB } from "../api/DB";
import type { CreateDiginextDomainParams } from "../diginext/dx-domain";
import { dxCreateDomain } from "../diginext/dx-domain";

export interface GenerateDomainOptions {
	/**
	 * Workspace data
	 */
	workspace: IWorkspace;
	/**
	 * Subdomain name
	 */
	subdomainName: string;
	/**
	 * @default diginext.site
	 */
	primaryDomain: string;
	/**
	 * Value of A RECORD
	 */
	ipAddress?: string;
	/**
	 * If cluster's short name is specify, IP address will be ignored and
	 * the primary IP address of the cluster will be used as the A RECORD value
	 */
	clusterShortName?: string;
}

interface GenerateDomainResult {
	status: number;
	domain: string;
	ip?: string;
	messages: string[];
}

export const generateDomains = async (params: GenerateDomainOptions) => {
	// Manage domains in database to avoid duplication
	const dxKey = params.workspace.dx_key;

	let { subdomainName, clusterShortName, ipAddress, primaryDomain } = params;
	let domain = `${subdomainName}.${primaryDomain}`;
	let targetIP: string;

	if (clusterShortName) {
		const cluster = await DB.findOne<ICluster>("cluster", { shortName: clusterShortName });
		if (!cluster) {
			logError(`Cluster "${clusterShortName}" not found.`);
			return { status: 0, domain, ip: null, messages: [`Cluster "${clusterShortName}" not found.`] } as GenerateDomainResult;
		}
		targetIP = cluster.primaryIP;
	}

	if (!targetIP) {
		if (!ipAddress) {
			logError(`Failed to generate domain: "ipAddress" is required.`);
			return { status: 0, messages: [`Failed to generate domain: "clusterShortName" or "ipAddress" is required.`] } as GenerateDomainResult;
		} else {
			targetIP = ipAddress;
		}
	}

	// create new subdomain:
	const domainData: CreateDiginextDomainParams = { name: subdomainName, data: targetIP };
	let res = isServerMode ? await dxCreateDomain(domainData, dxKey) : await fetchApi({ url: `/api/v1/domain`, method: "POST", data: domainData });

	// console.log("generateDomain > res :>> ", res);
	let { status, messages } = res;

	if (status === 0) {
		const [msg = ""] = messages;
		if (msg.indexOf("domain name is existed")) {
			const randomStr = randomStringByLength(6, "zxcvbnmasdfghjklqwertyuiop1234567890");
			subdomainName = `${randomStr}-${subdomainName}`;
			domain = `${subdomainName}.${primaryDomain}`;

			// create new domain again if domain was existed
			res = await dxCreateDomain({ name: subdomainName, data: targetIP }, dxKey);

			messages = res.messages;
			status = res.status;

			if (status === 1) return { status: 1, domain, ip: targetIP } as GenerateDomainResult;
		}

		if (msg) logError(`[DOMAIN] ${msg}`);
		return { status: 0, domain, ip: null, messages } as GenerateDomainResult;
	}

	return { status: 1, domain, ip: targetIP } as GenerateDomainResult;
};
