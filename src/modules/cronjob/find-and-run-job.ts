import chalk from "chalk";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { log, logSuccess } from "diginext-utils/dist/xconsole/log";

import { IsDev } from "@/app.config";
import { weekDays } from "@/entities/Cronjob";

import { DB } from "../api/DB";
import { runCronjob } from "./run-job";

dayjs.extend(localizedFormat);

export const findAndRunCronjob = async (workspaceId?: string) => {
	const now = dayjs().toDate();
	const filter: any = { nextRunAt: { $lte: now } };
	if (workspaceId) filter.workspace = workspaceId;

	const jobs = await DB.find("cronjob", filter);
	if (jobs?.length) {
		// find & execute jobs...
		const foundJobs = jobs
			.map((job) => {
				if (job.repeatCondition) {
					const { atDays, atHours, atMins, atMonths, atWeekDays } = job.repeatCondition;

					if (atMins && atMins.length > 0 && !atMins.includes(dayjs().minute())) return;
					if (atHours && atHours.length > 0 && !atHours.includes(dayjs().hour())) return;
					if (atDays && atDays.length > 0 && !atDays.includes(dayjs().date())) return;
					if (atMonths && atMonths.length > 0 && !atMonths.includes(dayjs().month())) return;
					if (atWeekDays && atWeekDays.length > 0 && !atWeekDays.includes(weekDays[dayjs().day()])) return;
				}

				runCronjob(job);

				return job;
			})
			.filter((job) => typeof job !== "undefined");

		if (foundJobs.length)
			logSuccess(
				`[CRONJOB] Cronjob checking... \nFound & execute ${foundJobs.length} jobs: ${foundJobs.map((job, index) =>
					chalk.magenta(`\n  [${index}] ${job.name} (ID: ${job._id}) [Run at: ${dayjs(job.nextRunAt).format("llll")}]`)
				)}`
			);
	} else {
		if (IsDev()) log(`[CRONJOB] Cronjob checking: found ${jobs.length} to execute.`);
	}
};
