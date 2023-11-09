import cliProgress from "cli-progress";
import { firstElement } from "diginext-utils/dist/array";
import { logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import fs from "fs";
import globby from "globby";
import path from "path";

import type { ICloudStorage } from "@/entities";

import type { InputOptions } from "../../interfaces/InputOptions";
import { getAppConfig, invalidateCache, resolveEnvFilePath, wait } from "../../plugins";
import { askForProjectAndApp } from "../apps/ask-project-and-app";
import { askForStorage } from "./ask-for-storage";

// config

// const defaultPattern = "./{public,.next/static}/**/*.*";
const defaultPattern = "./public/**/*.*";
// const pattern = "./public/**/*.*";

let projectName = "cli-test-project";
let storage: ICloudStorage;
// let projectSlug = "";
// let shouldOptimize = false;
// let isProduction = false;
const maxConcurrentUploadFiles = 5;

// progress bar
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);
let uploadedCount = 0,
	totalCount = 0;
let failedItems = [];
let uploadItems = [];

// testing
// startUpload();

type UploadCallbackParams = { env: string; project?: string; items?: any[] };
type UploadCompleteCallback = (params: UploadCallbackParams) => void;

async function purgeDirectory(dirPath, options) {
	// GOOGLE CLOUD
	if (!dirPath) {
		logError("Không tìm thấy resource path");
		return;
	}

	// const command = `gcloud compute url-maps invalidate-cdn-cache digitop-cdn-lb --host google-cdn.digitop.vn --path '${dirPath}' --async`;
	// log(command);
	// await cliContainerExec(command, options);

	// Use GOOGLE CDN HELPER API:
	await invalidateCache(dirPath);
}

async function upload(env, onComplete, options) {
	if (uploadedCount > uploadItems.length - 1) {
		progressBar.update(uploadedCount);
		progressBar.stop();
		return;
	}

	options = options || {};
	const version = options.hasOwnProperty("version") ? options.version : "";

	let filePath = uploadItems[uploadedCount];
	// filePath = filePath.replace("public/", `public${version}/`);

	if (options.isDebugging) {
		console.log("-----------------------------------");
		console.log("[upload] uploadedCount :>> ", uploadedCount);
		console.log("[upload] totalCount :>> ", uploadItems.length - 1);
		console.log("[upload] version :>> ", version);
		console.log("[upload] filePath :>> ", filePath);
		console.log("[upload] projectName :>> ", projectName);
	}

	uploadedCount++;

	const checkFinish = (resolve) => {
		progressBar.update(uploadedCount);

		if (uploadedCount >= totalCount) {
			progressBar.stop();

			// FINISH UPLOADING...
			if (failedItems.length > 0) {
				console.warn(`[WARNING] Unable to upload these files:`);
				failedItems.forEach((item) => {
					console.warn(`\n- ${item.path} (${item.reason})`);
				});
			}

			if (onComplete) onComplete();
		} else {
			upload(env, onComplete, options);
		}

		resolve();
	};

	return new Promise(async (resolve, reject) => {
		// UPLOAD TO GOOGLE CLOUD STORAGE:
		let destination = `${projectName}/${env}/${filePath}`;

		// attach "version" to destination files
		destination = destination.replace("public/", `public${version}/`);

		// NOTE: For "Next.js" project only
		destination = destination.replace(/\.next/g, "_next");

		try {
			// init service
			const { CloudStorageService } = await import("@/services");
			const svc = new CloudStorageService();

			// use service to upload
			const uploadRes = await svc.uploadFileFromFilePath(storage, filePath, destination, {
				cacheControl: "public, max-age=31536000",
				contentEncoding: "gzip",
			});
			// console.log("uploadRes :>> ", uploadRes);
			// await uploadFile(filePath, destination);
		} catch (e) {
			console.error(e);
			console.error(`[ERROR] Unable to upload file to "${storage.name} / ${storage.bucket}" storage: "${filePath}"`);
			resolve(e);
		}

		checkFinish(resolve);
	});
}

function uploadBatch(concurrency: number, env: string, onComplete: () => void, options?: { version?: string; isDebugging?: boolean }) {
	for (let i = 0; i < concurrency; i++) {
		upload(env, onComplete, options);
	}
}

/**
 * Upload static files of current working project to Cloud Storage
 */
export async function startUpload(options: InputOptions, onComplete?: UploadCompleteCallback) {
	const { version = "", env = "dev" } = options;

	// ask for project
	const { project } = await askForProjectAndApp(options.targetDirectory, options);

	// ask for storage
	storage = await askForStorage();
	if (options.isDebugging) console.log("storage :>> ", storage);

	projectName = project.slug;

	// reset arrays
	failedItems = [];
	uploadItems = [];
	failedItems = [];

	// parse static directory path:
	let uploadPathPattern = defaultPattern;
	if (uploadPathPattern.substring(0, 2) == "./") uploadPathPattern = uploadPathPattern.substring(2);

	if (options.path) {
		options.path = options.path.trim();
		if (options.path.charAt(0) == "/") {
			options.path = options.path.substring(1);
		} else if (options.path.substring(0, 2) == "./") {
			options.path = options.path.substring(2);
		}
		const lastChar = options.path.slice(-1);
		if (lastChar == "/") options.path = options.path.substring(0, options.path.length - 1);
		uploadPathPattern = `${options.path}/**/*.*`;
	}

	// log(`Uploading "${uploadPathPattern}" to "${DIGITOP_CDN_URL}/${projectName}/${env}"`);

	const files = await globby(uploadPathPattern);

	uploadedCount = 0;
	totalCount = files.length;
	uploadItems = [...files];

	if (options.isDebugging) {
		console.log(`[CDN] Start uploading > totalCount :>>`, totalCount);
		console.log(`[CDN] Start uploading > uploadItems :>>`, uploadItems);
	}

	progressBar.start(totalCount, 0);

	function onFinishUpload() {
		logSuccess(`Finished uploading files to "${env}" CDN of "${projectName}" project.`);
		if (onComplete) onComplete({ env, project: projectName, items: uploadItems });
		process.exit(1);
	}

	uploadBatch(maxConcurrentUploadFiles, env, onFinishUpload, { version, isDebugging: options.isDebugging });

	// NOTE: max wait time: 8 hours
	await wait(8 * 60 * 60 * 1000);
}

export async function purgeProject(options) {
	const config = getAppConfig();
	const { slug } = config;
	const { env } = options;

	// GOOGLE CLOUD
	await purgeDirectory(`/${slug}/${env}/*`, options);
}

export async function purgeAllCache(options) {
	const config = getAppConfig();
	const { slug } = config;

	// GOOGLE CLOUD
	await purgeDirectory(`/${slug}/*`, options);

	// DIGITAL OCEAN
	// TODO: Implement DigitalOcean SPACE purging cache feature
}

export const loadVersionCacheCDNFromEnv = (options: InputOptions) => {
	const { env } = options;
	//
	let version = "";

	//load .env.prod
	const envFilePath = resolveEnvFilePath({ env, ignoreIfNotExisted: false, targetDirectory: options.targetDirectory });

	if (fs.existsSync(envFilePath)) {
		const rawdata = fs.readFileSync(envFilePath).toString();

		// search NEXT_PUBLIC_VERSION_CDN in env
		// add NEXT_PUBLIC_VERSION_CDN if not found !!! edited: DO NOT ADD
		// return version

		const result = rawdata.match(/(\nNEXT_PUBLIC_VERSION_CDN=\/v[0-9]+)/);

		if (firstElement(result)) {
			const firstEle = firstElement(result);

			version = firstEle.replace("\nNEXT_PUBLIC_VERSION_CDN=", "");
		} else {
			// fs.appendFileSync(envFilePath, `\nNEXT_PUBLIC_VERSION_CDN=${version}`);
		}
	} else {
		version = "latest";
	}

	return version;
};

export function enableCDN(options) {
	const { env } = options;

	loadVersionCacheCDNFromEnv(options);

	let configFile = path.resolve("dx.json");
	let isFrameworkConfigExisted = fs.existsSync(path.resolve("dx.json"));
	if (!isFrameworkConfigExisted) {
		console.error("Diginext has't been initialized yet. Run `diginext new {project_name}` or `diginext init`.");
		return;
	}

	let cfg = JSON.parse(fs.readFileSync(configFile).toString());
	cfg.cdn = cfg.cdn ? cfg.cdn : { dev: false, staging: false, prod: false };

	cfg.cdn[env] = true;

	fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2), "utf8");
}

export function disableCDN(options) {
	const { env } = options;
	let configFile = path.resolve("dx.json");
	let isFrameworkConfigExisted = fs.existsSync(path.resolve("dx.json"));
	if (!isFrameworkConfigExisted) {
		console.error("Diginext has't been initialized yet. Run `diginext new {project_name}` or `diginext init`.");
		return;
	}

	let cfg = JSON.parse(fs.readFileSync(configFile).toString());
	cfg.cdn = cfg.cdn ? cfg.cdn : { dev: false, staging: false, prod: false };

	cfg.cdn[env] = false;

	fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2), "utf8");
}
