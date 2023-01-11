import type { InputOptions } from "../../interfaces/InputOptions";

/**
 * @param  {InputOptions} options
 * @param  {string} branch  master, staging, prod
 * @param  {('pull-request-only'|'fast-forward-only'|'no-deletes'|'read-only')} [type=null]  Permission type
 * @param  {('require_passing_builds_to_merge'|'force'|'require_all_dependencies_merged'|'allow_auto_merge_when_builds_pass'|'restrict_merges'|'enforce_merge_checks'|'reset_pullrequest_approvals_on_change'|'require_default_reviewer_approvals_to_merge'|'require_tasks_to_be_completed'|'require_approvals_to_merge'|'push'|'delete')} kind Permission kind
 * @param  {[string]} [groups = [{slug: "administrators"}]]  administrators, frontends, backends
 * @param  {[string]} [users = []]
 */
export const applyBranchPermissions = async (options: InputOptions, branch, type, kind, groups = [{ slug: "administrators" }], users = []) => {
	// TODO: get workspace name from git provider
	// let branchPattern = `${branch}*`;
	// let params = {
	// 	type: type,
	// 	kind: kind,
	// 	pattern: branchPattern,
	// 	groups: kind == "require_approvals_to_merge" ? null : groups,
	// 	// users: users,
	// 	value: kind == "push" || kind == "restrict_merges" ? null : 1,
	// };
	// // list
	// let res = await bitbucket.repositories.listBranchRestrictions({
	// 	workspace: config.workspace,
	// 	repo_slug: options.projectSlug,
	// });
	// // console.log("Current restrictions:", res.data.values);
	// let promises = [];
	// res.data.values.map(async (restriction) => {
	// 	if (restriction.pattern == branchPattern && restriction.kind == kind) {
	// 		try {
	// 			res = await bitbucket.repositories.updateBranchRestriction({
	// 				workspace: config.workspace,
	// 				repo_slug: options.projectSlug,
	// 				id: restriction.id,
	// 				_body: params,
	// 			});
	// 		} catch (e) {
	// 			// console.log(e);
	// 			logError(e);
	// 		}
	// 		promises.push(res);
	// 	}
	// });
	// // apply
	// try {
	// 	res = await bitbucket.repositories.createBranchRestriction({
	// 		workspace: config.workspace,
	// 		repo_slug: options.projectSlug,
	// 		_body: params,
	// 	});
	// } catch (e) {
	// 	if (e.status == 409) {
	// 		// nothing :)
	// 	} else {
	// 		await logBitbucketError(e, 400, "applyBranchPermissions");
	// 	}
	// }
};
