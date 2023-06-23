import axios from "axios";
import dayjs from "dayjs";
import { log, logError, logSuccess, logWarn } from "diginext-utils/dist/xconsole/log";

import { type CronjobHistory, type ICronjob } from "@/entities/Cronjob";

import { DB } from "../api/DB";
import { calculateNextRunAt } from "./calculate-next-run-at";

export const runCronjob = async (job: ICronjob) => {
	// call api request of the cronjob:
	axios({
		url: `${job.url}`,
		params: job.params,
		headers: job.headers,
		data: job.body || {},
		method: job.method || "GET",
	})
		.then(async ({ data: responseData, status: responseStatus }) => {
			logSuccess(`[CRONJOB] Job "${job.name}" (${job._id}) has been executed successfully:`, responseData);

			// add to cronjob's history:
			const cronjobHistory: CronjobHistory = {
				runAt: new Date(),
				status: "success",
				responseStatus,
				message: "Ok",
			};
			const updatedJob = await DB.updateOne<ICronjob>("cronjob", { _id: job._id }, { $push: { history: cronjobHistory } }, { raw: true });
		})
		.catch(async (e: any) => {
			logError(`[CRONJOB] Job "${job.name}" (${job._id}) failed:`, e);

			// add to cronjob's history:
			const cronjobHistory: CronjobHistory = {
				runAt: new Date(),
				status: "failed",
				responseStatus: e.data?.status || e.response?.status || e.status,
				message: e.toString(),
			};
			const updatedJob = await DB.updateOne<ICronjob>("cronjob", { _id: job._id }, { $push: { history: cronjobHistory } }, { raw: true });
		});

	// schedule a next run:
	const nextRunAt = calculateNextRunAt(job);
	const updateData: any = nextRunAt ? { nextRunAt } : { $unset: { nextRunAt: 1 } };
	const updatedJob = await DB.updateOne<ICronjob>("cronjob", { _id: job._id }, updateData, { raw: true });
	if (!updatedJob) logWarn(`[CRONJOB] Job "${job.name}" (${job._id}) > Unable to set next schedule.`);
	if (nextRunAt) log(`[CRONJOB] Job "${job.name}" (${job._id}) > Next schedule: ${dayjs(nextRunAt).format("llll")}`);
};
