import { logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";

import { type ICronjob } from "@/entities/Cronjob";

import { DB } from "../api/DB";

export const cancelCronjob = async (job: ICronjob) => {
	if (!job) throw new Error(`Cronjob "job" is required.`);
	const updateData: any = { $unset: { nextRunAt: 1 }, active: false };
	const updatedJob = await DB.updateOne<ICronjob>("cronjob", { _id: job._id }, updateData, { raw: true });
	if (!updatedJob) logWarn(`[CRONJOB] Job "${job.name}" (${job._id}) > Unable to set next schedule.`);
	logSuccess(`[CRONJOB] Job "${job.name}" (${job._id}) has been cancelled`);
	return updatedJob;
};

export const cancelCronjobById = async (id: string) => {
	if (!id) throw new Error(`Cronjob "id" is required.`);
	const updateData: any = { $unset: { nextRunAt: 1 }, active: false };
	const updatedJob = await DB.updateOne<ICronjob>("cronjob", { _id: id }, updateData, { raw: true });
	if (!updatedJob) logWarn(`[CRONJOB] Job "${updatedJob.name}" (${updatedJob._id}) > Unable to set next schedule.`);
	logSuccess(`[CRONJOB] Job "${updatedJob.name}" (${updatedJob._id}) has been cancelled`);
	return updatedJob;
};
