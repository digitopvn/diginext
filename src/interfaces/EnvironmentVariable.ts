export interface EnvironmentVariable {
	name: string;
	value: string;
	type: "string" | "secret";
}
