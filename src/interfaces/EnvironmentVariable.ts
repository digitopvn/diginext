export interface KubeEnvironmentVariable {
	name: string;
	value: string;
}

export interface DiginextEnvironmentVariable {
	name: string;
	value: string;
	/**
	 * @default "string"
	 */
	type?: "string" | "secret";
}
