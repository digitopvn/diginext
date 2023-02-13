import type InputOptions from "@/interfaces/InputOptions";

/**
 * Take down a project from a K8S cluster
 * @example
 * dx down --input=deployment/deployment.yaml
 * dx down --env=canary
 * @param  {InputOptions} options
 */
export const takedownProject = async (options?: InputOptions) => {
	// TODO: Implement take down an app from a cluster
};

export async function execTakeDown(options?: InputOptions) {
	// TODO: implement take down app deployment
}
