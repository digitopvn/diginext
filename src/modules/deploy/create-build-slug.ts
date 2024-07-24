export type CreateBuildSlugParams = {
	projectSlug: string;
	appSlug: string;
	buildTag: string;
};

export function createBuildSlug(params: CreateBuildSlugParams) {
	return `${params.projectSlug}_${params.appSlug}_${params.buildTag}`;
}
