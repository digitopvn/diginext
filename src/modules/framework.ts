import detectPrivateKey from "diginext-utils/dist/file/detectPrivateKey";

import type { InputOptions } from "@/interfaces/InputOptions";

import { cleanUp, cloneGitFramework, copyAllResources, pullingLatestFrameworkVersion } from "./bitbucket";

export const getLatestFrameworkVersion = async (framework = "diginext") => {
	// let { data } = await bitbucket.repositories.listTags({
	// 	repo_slug: config.framework[framework],
	// 	workspace: config.workspace,
	// 	sort: "-name",
	// });
	// if (typeof data.values == "undefined" || data.values.length == 0) {
	// 	logError(`This framework repository doesn't have any released tags.`);
	// 	return;
	// }
	// // exclude "beta" and "alpha" tags
	// let versionList = (data.values || [{ name: "main" }]).filter((ver) => !ver.name.includes("beta"));
	// return versionList && versionList.length > 0 ? versionList[0].name : "main";
};

export const getFrameworkVersions = async (framework = "diginext") => {
	// let { data } = await bitbucket.repositories.listTags({
	// 	repo_slug: config.framework[framework],
	// 	workspace: config.workspace,
	// 	sort: "-name",
	// });
	// if (typeof data.values == "undefined" || data.values.length == 0) {
	// 	logError(`This framework repository doesn't have any released tags.`);
	// 	return;
	// }
	// return data.values;
};

export const selectFrameworkVersion = async (framework = "diginext") => {
	// TODO: What the fuck is this??
	// let { data } = await bitbucket.repositories.listTags({
	// 	repo_slug: config.framework[framework],
	// 	workspace: config.workspace,
	// 	sort: "-name",
	// });
	// let versionList = typeof data.values != undefined && data.values.length > 0 ? [...data.values] : ["main"];
	// return versionList;
};

export async function pullingFramework(options: InputOptions) {
	if (options.framework.name != "none") {
		// TODO: Select specific branch as a version?
		// if (options.framework.includes("/tools/")) {
		// 	const fwName = options.framework.split("/")[0];
		// 	options.frameworkVersion = options.framework.replace(new RegExp(`${fwName}/`), "") + "/master";
		// 	options.framework = fwName;

		// 	await pullingLatestFrameworkVersion(options, options.framework, options.frameworkVersion);
		// } else {
		// 	options.frameworkVersion = await getLatestFrameworkVersion(options.framework);
		// 	await pullingLatestFrameworkVersion(options, options.framework, options.frameworkVersion);
		// }

		await pullingLatestFrameworkVersion(options);

		await copyAllResources(options.targetDirectory);

		await cleanUp();
	}

	return true;
}

export async function pullingRepoToNewGitDir(options: InputOptions) {
	await cloneGitFramework(options);

	await copyAllResources(options.targetDirectory);

	await cleanUp();

	const result = detectPrivateKey(options.targetDirectory);
	if (result.status) {
		//
	} else {
		//
		console.log("FOUND PRIVATE KEY OR SECRET ENV, PLEASE IGNORE THEM BEFORE PUSH TO GIT");
		console.log(result.list);
		return false;
	}

	return true;
}
