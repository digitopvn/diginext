import { logError } from "diginext-utils/dist/console/log";
import execa from "execa";
import { isEmpty } from "lodash";

import { cliOpts } from "@/config/config";
import type { BuildPlatform } from "@/interfaces/SystemTypes";
import { wait } from "@/plugins";

interface PodmanBuildOptions {
	dockerFile?: string;
	buildDirectory?: string;
	/**
	 * Set the target platform for the build.
	 */
	platforms?: BuildPlatform[];
	// platforms?: ("arm" | "arm64" | "386" | "amd64" | "ppc64le" | "s390x")[];
	/**
	 * Will automatically push the build result to registry after build success.
	 */
	shouldPush?: boolean;
	/**
	 * Driver to use (available: `docker-container`, `remote`)
	 * - [DEFAULT] `docker-container`: Uses a BuildKit container that will be spawned via docker. With this driver, both building multi-platform images and exporting cache are supported.
	 * - `remote`: Uses a remote instance of buildkitd over an arbitrary connection. With this driver, you manually create and manage instances of buildkit yourself, and configure buildx to point at it.
	 *
	 * 	*Unlike docker driver, built images will not automatically appear in docker images and build --load needs to be used to achieve that.*
	 */
	// driver?: "docker-container" | "remote";
	/**
	 * Builder container name
	 */
	builder?: string;
	/**
	 * Use an external cache source for a build.
	 * - [TYPE/DEFAULT] `registry`: can import cache from a cache manifest or (special) image configuration on the registry.
	 * - [TYPE] `local`: can import cache from local files previously exported with `--cache-to`.
	 * - [TYPE] `s3`: can import cache from a previously exported cache with `--cache-to` in your S3 bucket
	 * @example
	 * docker buildx build --cache-from=user/app:cache .
	 * docker buildx build --cache-from=user/app .
	 * docker buildx build --cache-from=type=registry,ref=user/app .
	 * docker buildx build --cache-from=type=local,src=path/to/cache .
	 * docker buildx build --cache-from=type=gha .
	 * docker buildx build --cache-from=type=s3,region=eu-west-1,bucket=mybucket .
	 */
	cacheFroms?: { type: "local" | "registry" | "s3"; value: string }[];
	/**
	 * Build logs listener
	 */
	onBuilding?: (message: string) => void;
	onError?: (message: string) => void;
}

const processes = {};

/**
 * Build Docker image
 * @returns Image URL of the build
 */
export const build = async (imageURL: string, options?: PodmanBuildOptions) => {
	const {
		dockerFile,
		buildDirectory,
		// driver = "docker-container",
		builder,
		cacheFroms,
		platforms,
		shouldPush = false,
		onBuilding,
		onError,
	} = options;

	/**
	 * @example
	 * docker buildx build -f Dockerfile --push -t asia.gcr.io/top-group-k8s/test-cli/front-end:2022-12-26-23-20-07 --cache-from type=registry,ref=asia.gcr.io/top-group-k8s/test-cli/front-end:2022-12-26-23-20-07 .
	 **/

	// const buildContextNameFlag = !isEmpty(builder) ? `--name ${builder}` : "";
	const platformFlag = !isEmpty(platforms) && `--arch=${platforms.map((p) => p.split("/")[1]).join(",")}`;

	// await execCmd(
	// 	`docker buildx create ${platformFlag} --driver ${driver} ${buildContextNameFlag}`,
	// 	"Docker build context instance was existed, no worries, just ignoring this message."
	// );

	// latestBuild ? ` --cache-from type=registry,ref=${latestBuild.image}` : "";

	/**
	 * --cache-from: repository must contain neither a tag nor digest
	 */
	const cacheFlags = !isEmpty(cacheFroms)
		? cacheFroms.map((cache) => {
				let cacheURL = cache.value.indexOf(":") > -1 ? cache.value.split(":")[0] : cache.value;
				return `--cache-from ${cacheURL}`;
		  })
		: [];

	const dockerFileFlag = `-f ${dockerFile}`;
	// const pushFlag = shouldPush ? "--push" : undefined;
	const tagFlag = `-t ${imageURL}`;
	// const builderFlag = `--builder=${builder}`;
	const directoryFlag = buildDirectory ?? ".";

	const optionFlags = [platformFlag, dockerFileFlag, tagFlag, ...cacheFlags, directoryFlag]
		.filter((opt) => typeof opt !== "undefined") // <-- filter empty flags
		.join(" ");

	// docker build command:
	const buildCmd = `podman build ${optionFlags}`;

	let stream = execa.command(buildCmd, cliOpts);
	processes[builder] = stream;

	stream.stdio.forEach((_stdio) => {
		if (_stdio) {
			_stdio.on("data", (data) => {
				if (onBuilding) onBuilding(data.toString());
			});
		}
	});
	await stream;

	if (shouldPush) {
		stream = execa.command(`podman push ${imageURL}`, cliOpts);
		processes[builder] = stream;

		stream.stdio.forEach((_stdio) => {
			if (_stdio)
				_stdio.on("data", (data) => {
					if (onBuilding) onBuilding(data.toString());
				});
		});
		await stream;
	}

	return imageURL;
};

/**
 * Stop the build
 * @returns Image URL of the build
 */
export const stopBuild = async (builder: string) => {
	try {
		processes[builder]?.kill("SIGTERM", {
			forceKillAfterTimeout: 2000,
		});
		delete processes[builder];
		// await execa.command(`docker buildx stop ${builder}`, cliOpts);
		// await execa.command(`docker buildx stop buildx_buildkit_${builder}`, cliOpts);
		await wait(500); // <-- just to be sure...
	} catch (e) {
		logError(`[BUILDER] Podman > stopBuild :>>`, e);
		return false;
	}
	return true;
};
