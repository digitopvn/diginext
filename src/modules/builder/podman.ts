import type { BuildPlatform } from "@/interfaces/SystemTypes";

interface PodmanBuildGenericOptions {
	cacheImage?: string;
	platforms?: BuildPlatform[];
	shouldPush?: boolean;
	/**
	 * Specify an additional build context using its short name and its location.
	 * - Local directory: `--build-context project2=../path/to/project2/src`
	 * - HTTP URL to a tarball: `--build-context src=https://example.org/releases/src.tar`
	 * - Container image – specified with a `container-image://` prefix, e.g. `--build-context alpine=container-image://alpine:3.15, (also accepts docker://, docker-image://)`
	 */
	buildContext?: string;
}

interface PodmanBuildOptions extends PodmanBuildGenericOptions {}

export const build = (imageURL: string, options?: PodmanBuildOptions) => {};
