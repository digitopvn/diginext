import { existsSync, readdirSync, statSync } from "fs";
import path from "path";

export function getDirectoriesInDirectory(directoryPath: string): string[] {
	try {
		const files = readdirSync(directoryPath);
		const directories = files.filter((file) => statSync(path.join(directoryPath, file)).isDirectory());
		return directories;
	} catch (e) {
		return [];
	}
}

export async function getFolderStructure(dir: string = process.cwd()) {
	if (!existsSync(dir)) throw new Error(`Directory not existed.`);

	// scan directory for file structure:
	const patterns: string[] = [
		path.join(dir, "*"),
		path.join(dir, "*/*"),
		`!${path.join(dir, ".git*")}`,
		`!${path.join(dir, "Dockerfile*")}`,
		`!${path.join(dir, "docker-compose*")}`,
	];
	const { globby } = await import("globby");
	const files = await globby(patterns, {
		expandDirectories: true,
		gitignore: true,
	});
	// const dirs = getDirectoriesInDirectory(dir);
	// files.push(...dirs.map((d) => `./${d}`));

	const filesInStr =
		"\n- " +
		files
			.map((filePath) => filePath.replace(dir, "."))
			.sort()
			.join("\n- ");

	return filesInStr;
}
