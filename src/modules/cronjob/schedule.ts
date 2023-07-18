import { type CronjobDto, type CronjobRepeat, type CronjobRequest, type CronjonRepeatCondition } from "@/entities/Cronjob";

export async function createCronjobAtTime(name: string, request: CronjobRequest, time: Date, ownership: { owner: string; workspace: string }) {
	const jobData: CronjobDto = {
		name,
		...request,
		nextRunAt: time,
	};
	const { DB } = await import("@/modules/api/DB");
	const job = await DB.create("cronjob", { ...jobData, ...ownership });
	return job;
}

export async function createCronjobRepeat(
	name: string,
	request: CronjobRequest,
	repeat: CronjobRepeat,
	condition: CronjonRepeatCondition,
	ownership: { owner: string; workspace: string }
) {
	const { DB } = await import("@/modules/api/DB");
	const repeatCondition = condition || {};

	const jobData: CronjobDto = {
		name,
		...request,
		repeat,
		repeatCondition,
	};

	// insert to database
	const job = await DB.create("cronjob", { ...jobData, ...ownership });
	return job;
}
