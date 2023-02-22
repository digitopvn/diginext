import Axios from "axios";
import Configstore from "configstore";
import { log, logError, logSuccess } from "diginext-utils/dist/console/log";

import pkg from "@/../package.json";

const conf = new Configstore(pkg.name);

const { Storage } = require("@google-cloud/storage");
const path = require("path");

const bucketName = "digitop-cdn-sg";

let prevInvalidateTime;

// Creates a client
const credFile = path.resolve(__dirname, "../cred/TOP Group K8S-c08c41784317.json");
// console.log(credFile);

/**
 * TODO: INVALIDATE CACHE
 * Reference: https://cloud.google.com/compute/docs/reference/rest/v1/urlMaps/invalidateCache
 * Installation: npm install googleapis --save
 *  */

const storage = new Storage({
	projectId: "top-group-k8s",
	keyFilename: credFile,
});

export async function uploadFile(filename, destination) {
	// Uploads a local file to the bucket
	try {
		await storage.bucket(bucketName).upload(filename, {
			// chunkSize: 5 * 1024 * 1024, // 5MB
			// Support for HTTP requests made with `Accept-Encoding: gzip`
			gzip: true,
			// By setting the option `destination`, you can change the name of the
			// object you are uploading to a bucket.
			destination: destination,
			metadata: {
				// Enable long-lived HTTP caching headers
				// Use only if the contents of the file will never change
				// (If the contents will change, use cacheControl: 'no-cache')
				cacheControl: "public,max-age=31536000", // 1 year
			},
		});

		// log(`${filename} uploaded to ${bucketName}.`);
	} catch (e) {
		log(`Error when uploading`, filename, "to", destination + ":", e);
		// logError(e);
	}
}

export const invalidateCache = async (resourcePath) => {
	let now = Date.now();

	prevInvalidateTime = conf.get("prevInvalidateTime");
	// log("prevInvalidateTime", now - prevInvalidateTime);

	if (prevInvalidateTime) {
		conf.set("prevInvalidateTime", now);
		let timePassed = now - prevInvalidateTime;
		let timeLeft = 60000 - timePassed;
		if (timePassed < 59000) {
			logError(`[CDN] Rate limit exceeded (1 times/minute) - ${Math.round(timeLeft / 1000)} seconds left...`);
		}
	}
	conf.set("prevInvalidateTime", now);

	const cacheApiUrl = "https://google-cdn-util.zii.vn/purge";
	const inputData = { path: resourcePath };
	try {
		const { data } = await Axios({ url: cacheApiUrl, data: inputData, method: "post" });
		log(data);

		if (data.status == 1) {
			logSuccess("[CDN]", data.message);
		} else {
			logError("[CDN]", data.message);
		}
	} catch (e) {
		logError("[CDN]", e);
	}
};

// uploadFile().catch(console.error);
