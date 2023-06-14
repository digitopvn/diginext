import { logError } from "diginext-utils/dist/console/log";
import execa from "execa";
import { isEmpty } from "lodash";

import { cliOpts } from "@/config/config";
import type { DockerImageType } from "@/interfaces/DockerResourceTypes";
import type { BuildPlatform } from "@/interfaces/SystemTypes";
import { execCmd, wait } from "@/plugins";

interface DockerBuildOptions {
	dockerFile?: string;
	buildDirectory?: string;
	/**
	 * Set the target platform for the build.
	 */
	platforms?: BuildPlatform[];
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
	driver?: "docker-container" | "remote";
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
	 * Specify build arguments
	 * @example
	 * docker build --build-arg ARG_NAME_1=ARG_VALUE_1 --build-arg ARG_NAME_2=ARG_VALUE_2 -t IMAGE_NAME:TAG .
	 */
	args?: { name: string; value: string }[];
	/**
	 * Build logs listener
	 */
	onBuilding?: (message: string) => void;
	onError?: (message: string) => void;
}

// const processes = {}

/**
 * Build Docker image
 * @returns Image URL of the build
 */
export const build = async (imageURL: string, options?: DockerBuildOptions) => {
	const {
		dockerFile,
		buildDirectory,
		driver = "docker-container",
		builder,
		cacheFroms,
		args,
		platforms,
		shouldPush = false,
		onBuilding,
		onError,
	} = options;

	/**
	 * @example
	 * docker buildx build -f Dockerfile --push -t asia.gcr.io/top-group-k8s/test-cli/front-end:2022-12-26-23-20-07 --cache-from type=registry,ref=asia.gcr.io/top-group-k8s/test-cli/front-end:2022-12-26-23-20-07 .
	 **/

	const buildContextNameFlag = builder ? `--name ${builder}` : "";
	const platformFlag = !isEmpty(platforms) && `--platform=${platforms.join(",")}`;

	await execCmd(
		`docker buildx create --driver ${driver} ${buildContextNameFlag}`,
		"Docker build context instance was existed, no worries, just ignoring this message."
	);

	// latestBuild ? ` --cache-from type=registry,ref=${latestBuild.image}` : "";
	const argsFlags = !isEmpty(args)
		? args.map(({ name, value }) => {
				if (name.indexOf(" ") > -1) throw new Error(`Name of an argument in "--build-arg" SHOULD NOT contains spacing.`);
				if (value.indexOf(" ") > -1) throw new Error(`Value of an argument in "--build-arg" SHOULD NOT contains spacing.`);
				return `--build-arg ${name}=${value}`;
		  })
		: [];

	const cacheFlags = !isEmpty(cacheFroms) ? cacheFroms.map((cache) => `--cache-from type=${cache.type || "registry"},ref=${cache.value}`) : [];
	const dockerFileFlag = `-f ${dockerFile}`;
	const pushFlag = shouldPush ? "--push" : undefined;
	const tagFlag = `-t ${imageURL}`;
	const builderFlag = `--builder=${builder}`;
	const directoryFlag = buildDirectory ?? ".";

	const optionFlags = [...argsFlags, platformFlag, dockerFileFlag, pushFlag, tagFlag, ...cacheFlags, builderFlag, directoryFlag]
		.filter((opt) => typeof opt !== "undefined") // <-- filter empty flags
		.join(" ");

	// docker build command:
	const buildCmd = `docker buildx build ${optionFlags}`;

	const stream = execa.command(buildCmd, cliOpts);
	stream.stdio.forEach((_stdio) => {
		if (_stdio) {
			_stdio.on("data", (data) => {
				let buildMessage = data.toString();
				// just ignore cache import error
				if (buildMessage.indexOf("importing cache manifest from") > -1) return;
				if (buildMessage.indexOf("failed to configure registry cache") > -1) return;
				if (onBuilding && buildMessage) onBuilding(buildMessage);
			});
		}
	});
	await stream;

	return imageURL;
};

/**
 * Stop the build
 * @returns Image URL of the build
 */
export const stopBuild = async (builder: string) => {
	try {
		await execa.command(`docker buildx stop ${builder}`, cliOpts);
		await execa.command(`docker buildx stop buildx_buildkit_${builder}`, cliOpts);
		await execa.command(`docker buildx stop buildx_buildkit_${builder}0`, cliOpts);
		await wait(500); // <-- just to be sure...
	} catch (e) {
		logError(`[BUILDER] Docker > stopBuild :>>`, e);
		// return false;
	}
	return true;
};

export const getAllImages = async () => {
	const jsonList = await execa.command(`docker images --format "{{json .}}"`);
	const imgArr = jsonList.stdout.split("\n").map((line) => JSON.parse(line));
	return imgArr as DockerImageType[];
};
