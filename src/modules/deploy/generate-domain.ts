import { logError } from "diginext-utils/dist/console/log";

import type { Cluster } from "@/entities";

import { DB } from "../api/DB";
import { createRecordInDomain } from "../providers/digitalocean";

interface GenerateDomainOptions {
	subdomainName: string;
	primaryDomain: string;
	clusterShortName?: string;
	ipAddress?: string;
}

export const generateDomains = async (params: GenerateDomainOptions) => {
	// Manage domains in database to avoid duplication

	const { subdomainName, clusterShortName, ipAddress, primaryDomain } = params;
	const domain = `${subdomainName}.${primaryDomain}`;
	let targetIP;

	if (clusterShortName) {
		const cluster = await DB.findOne<Cluster>("cluster", { shortName: clusterShortName });
		if (!cluster) {
			logError(`Cluster "${clusterShortName}" not found.`);
			return { status: 0, domain, ip: null };
		}
		targetIP = cluster.primaryIP;
	}

	if (!targetIP) {
		if (!ipAddress) {
			logError(`Failed to generate domain: "clusterShortName" or "ipAddress" is required.`);
			return { status: 0 };
		} else {
			targetIP = ipAddress;
		}
	}

	// create new subdomain:
	await createRecordInDomain({ name: subdomainName, data: targetIP, type: "A" });

	return { status: 1, domain, ip: targetIP };
};
