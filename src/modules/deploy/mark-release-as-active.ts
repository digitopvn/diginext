import { MongoDB } from "@/plugins/mongodb";
import { ReleaseService } from "@/services";

export async function markReleaseAsActive(params: { id: string; appSlug: string; env: string }) {
	const { id, appSlug, env } = params;
	const releaseId = MongoDB.toString(id);

	// Mark previous releases as "inactive":
	const releaseSvc = new ReleaseService();
	await releaseSvc.update({ appSlug, env, active: true }, { active: false }, { select: ["_id", "active", "appSlug"] });

	// Mark this latest release as "active":
	const latestRelease = await releaseSvc.updateOne(
		{ _id: releaseId },
		{ active: true, status: "success" },
		{ select: ["_id", "active", "appSlug"] }
	);

	return latestRelease;
}
