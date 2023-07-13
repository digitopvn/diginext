import { logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";

import { type ICronjob } from "@/entities/Cronjob";

export const cancelCronjob = async (job: ICronjob) => {
	const { DB } = await import("@/modules/api/DB");
	if (!job) throw new Error(`Cronjob "job" is required.`);
	const updateData: any = { $unset: { nextRunAt: 1 }, active: false };
	const updatedJob = await DB.updateOne("cronjob", { _id: job._id }, updateData, { raw: true });
	if (!updatedJob) logWarn(`[CRONJOB] Job "${job.name}" (${job._id}) > Unable to set next schedule.`);
	logSuccess(`[CRONJOB] Job "${job.name}" (${job._id}) has been cancelled`);
	return updatedJob;
};

export const cancelCronjobById = async (id: string) => {
	const { DB } = await import("@/modules/api/DB");
	if (!id) throw new Error(`Cronjob "id" is required.`);
	const updateData: any = { $unset: { nextRunAt: 1 }, active: false };
	const updatedJob = await DB.updateOne("cronjob", { _id: id }, updateData, { raw: true });
	if (!updatedJob) logWarn(`[CRONJOB] Job "${updatedJob.name}" (${updatedJob._id}) > Unable to set next schedule.`);
	logSuccess(`[CRONJOB] Job "${updatedJob.name}" (${updatedJob._id}) has been cancelled`);
	return updatedJob;
};
