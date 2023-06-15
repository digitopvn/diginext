const fs = require("fs");
const path = require("path");
const cliProgress = require("cli-progress");

import { firstElement } from "diginext-utils/dist/array";
import { log, logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import globby from "globby";

import { DIGITOP_CDN_URL } from "../../config/const";
import type { InputOptions } from "../../interfaces/InputOptions";
import { getAppConfig, invalidateCache, uploadFile } from "../../plugins";

// config

// const defaultPattern = "./{public,.next/static}/**/*.*";
const defaultPattern = "./public/**/*.*";
// const pattern = "./public/**/*.*";
const url = "https://cdn.digitop.vn/api/files/upload";

let projectName = "cli-test-project";
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
	filePath = filePath.replace("public/", `public${version}/`);

	uploadedCount++;

	const countFinish = (resolve) => {
		// uploadedCount++;
		progressBar.update(uploadedCount);

		if (uploadedCount >= totalCount) {
			progressBar.stop();

			// FINISH UPLOADING...
			if (failedItems.length > 0) {
				console.warn(`[WARNING] Không thể upload những file sau:`);
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
		destination = destination.replace(/\.next/g, "_next");

		try {
			await uploadFile(filePath, destination);
		} catch (e) {
			resolve(e);
		}

		countFinish(resolve);
	});
}

function uploadBatch(concurrency, env, onComplete, options) {
	for (let i = 0; i < concurrency; i++) {
		upload(env, onComplete, options);
	}
}

/**
 *
 * @param {InputOptions} options
 * @param {UploadCompleteCallback} onComplete
 * @returns
 */
export async function startUpload(options: InputOptions, onComplete?: UploadCompleteCallback) {
	const { version = "", env = "dev" } = options;
	// check for diginext config:

	let configFile = path.resolve("dx.json");
	let isFrameworkConfigExisted = fs.existsSync(path.resolve("dx.json"));
	if (!isFrameworkConfigExisted) {
		await logError(
			"Diginext has't been initialized yet. Run `diginext new` to create new project or `diginext init` to initialize current directory."
		);
		return;
	}

	const configStr = fs.readFileSync(configFile);
	const config = JSON.parse(configStr);

	projectName = config.projectSlug;
	// shouldOptimize = options && options.optimize === true ? true : false;
	// isProduction = options && options.isProd === true ? true : false;

	failedItems = [];
	uploadItems = [];

	// parse static directory path:
	let uploadPathPattern = defaultPattern;

	if (options.path) {
		options.path = options.path.trim();
		if (options.path.charAt(0) == "/") {
			options.path = options.path.substring(1);
		} else if (options.path.substring(2) == "./") {
			options.path = options.path.substring(2);
		}
		const lastChar = options.path.slice(-1);
		if (lastChar == "/") options.path = options.path.substring(0, options.path.length - 1);
		uploadPathPattern = `${options.path}/**/*.*`;
	}

	log(`Uploading "${uploadPathPattern}" to "${DIGITOP_CDN_URL}/${projectName}/${env}"`);

	const files = await globby(uploadPathPattern);
	uploadedCount = 0;
	totalCount = files.length;
	uploadItems = [...files];

	progressBar.start(totalCount, 0);

	uploadBatch(
		maxConcurrentUploadFiles,
		env,
		() => {
			logSuccess(`Upload files lên ${env} CDN của dự án "${projectName}" thành công.`);
			if (onComplete) onComplete({ env, project: projectName, items: uploadItems });
			process.exit(1);
		},
		{ version }
	);
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

export const loadVersionCacheCDNFromEnv = (options) => {
	const { env } = options;
	//
	let version = "";

	//load .env.prod
	let envFilePath = path.resolve(`deployment/.env.${env}`);
	if (!fs.existsSync(envFilePath)) envFilePath = path.resolve(`.env.${env}`);
	if (!fs.existsSync(envFilePath)) envFilePath = path.resolve(`.env`);

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

	let cfg = JSON.parse(fs.readFileSync(configFile));
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

	let cfg = JSON.parse(fs.readFileSync(configFile));
	cfg.cdn = cfg.cdn ? cfg.cdn : { dev: false, staging: false, prod: false };

	cfg.cdn[env] = false;

	fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2), "utf8");
}
