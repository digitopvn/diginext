import { projectSlug } from "../../main";
import { logBitbucketError } from "../../plugins/utils";
import { bitbucket } from ".";

export const enablePipelines = async () => {
	// TODO: get workspace name from git provider
	const workspace = "digitopvn";

	try {
		var { data, headers } = await bitbucket.repositories.updatePipelineConfig({
			workspace: workspace,
			repo_slug: projectSlug,
			_body: { enabled: true },
		});
	} catch (e) {
		await logBitbucketError(e, 400);
	}
};

export const disablePipelines = async () => {
	// TODO: get workspace name from git provider
	const workspace = "digitopvn";

	try {
		var { data, headers } = await bitbucket.repositories.updatePipelineConfig({
			workspace: workspace,
			repo_slug: projectSlug,
			_body: { enabled: false },
		});
	} catch (e) {
		await logBitbucketError(e, 400);
	}
};
