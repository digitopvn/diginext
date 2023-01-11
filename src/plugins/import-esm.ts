import path from "path";

const Module = require("module");
const { isAbsolute } = require("path");

export async function importEsm(specifier, module) {
	if (isAbsolute) {
		return import(specifier);
	}
	let resolvedPath;
	try {
		const req = Module.createRequire(module.filename);
		try {
			resolvedPath = req.resolve(path.join(specifier, "package.json"));
		} catch {
			resolvedPath = req.resolve(specifier);
		}
	} catch {
		throw new Error(
			`Unable to locate module "${specifier}" relative to "${module?.filename}" using the CommonJS resolver.  Consider passing an absolute path to the target module.`
		);
	}
	return import(resolvedPath);
}

export default importEsm;
