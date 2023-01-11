export interface PackageConfig {
	name: string;
	version: string;
	description?: string;
	author?: string | { name?: string; email?: string };
	license?: string;
	keywords?: string[];
	files?: string[];
	main?: string;
	bin?: { [key: string]: string };
	engines?: { [key: string]: string };
	scripts?: { [key: string]: string };
	dependencies?: { [key: string]: string };
	devDependencies: { [key: string]: string };
}
