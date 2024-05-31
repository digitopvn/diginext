export interface DomainRecord {
	id?: string | number;
	/**
	 * The priority for SRV and MX records.
	 */
	priority?: number;
	/**
	 * The port for SRV records.
	 */
	port?: number;
	/**
	 * This value is the time to live for the record, in seconds. This defines the time frame that clients can cache queried information before a refresh should be requested.
	 */
	ttl?: number;
	/**
	 * The weight for SRV records.
	 */
	weight?: string;
	/**
	 * An unsigned integer between 0-255 used for CAA records.
	 */
	flags?: number;
	/**
	 * The parameter tag for CAA records. Valid values are "issue", "issuewild", or "iodef"
	 */
	tag?: string | number;

	/**
	 * The host name, alias, or service being defined by the record.
	 * - This could be the subdomain name: `sub-domain-name.dxup.dev`
	 * @example "@"
	 */
	name: string;

	/**
	 * The type of the DNS record. For example: `A`, `CNAME`, `TXT`, ...
	 * @default "A"
	 */
	type?: "A" | "AAAA" | "CAA" | "CNAME" | "MX" | "NS" | "SOA" | "SRV" | "TXT";

	/**
	 * Variable data depending on record type.
	 * - For example, the "data" value for an A record would be the IPv4 address to which the domain will be mapped.
	 * - For a CAA record, it would contain the domain name of the CA being granted permission to issue certificates.
	 */
	data: string;
}
