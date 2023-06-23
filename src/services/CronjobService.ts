import dayjs from "dayjs";

import type { CronjobDto } from "@/entities/Cronjob";
import { type ICronjob, cronjobRepeatUnitList, cronjobSchema, weekDays } from "@/entities/Cronjob";
import type { IQueryOptions } from "@/interfaces";
import { calculateNextRunAt } from "@/modules/cronjob/calculate-next-run-at";
import { filterUniqueItems, sortedDaysOfWeek } from "@/plugins/array";

import BaseService from "./BaseService";

class CronjobService extends BaseService<ICronjob> {
	constructor() {
		super(cronjobSchema);
	}

	create(data: CronjobDto, options?: IQueryOptions): Promise<ICronjob> {
		// validate
		if (data.repeat) {
			if (!data.repeat.range) throw new Error(`"repeat.range" is required.`);
			if (!data.repeat.unit) throw new Error(`Cronjob "repeat.unit" is required, one of: ${cronjobRepeatUnitList.join(", ")}`);
			if (!data.repeat.range) data.repeat.range = 1;
			if (data.repeat.range <= 0) throw new Error(`Cronjob "repeat.range" cannot be zero or negative.`);
		}

		if (!data.repeatCondition) data.repeatCondition = {};

		/**
		 * Examples:
		 * ✓ Every month (monthly), at [weekdays: "mon", "tue", "fri"] ?
		 * ✓ Every day (daily), at [weekdays: "mon", "tue", "fri"] ?
		 * ✓ Every 5 minutes, at [hours: 13,14,18] ?
		 * ✓ Every 2 hours, at [minutes: 5,10] and [weekdays: mon,wed,thu,sat] ?
		 */
		// if (data.repeat.unit === "minute") data.repeatCondition.atMins = undefined;
		// if (data.repeat.unit === "hour") data.repeatCondition.atHours = undefined;
		// if (data.repeat.unit === "day") data.repeatCondition.atDays = undefined;
		// if (data.repeat.unit === "month") data.repeatCondition.atMonths = undefined;

		// validate repeat conditions
		// repeat conditions should be unique arrays
		if (data.repeatCondition.atMins)
			data.repeatCondition.atMins = filterUniqueItems(data.repeatCondition.atMins)
				.map((item) => {
					// validate
					if (item < 0 || item > 59)
						throw new Error(`Values in "repeatCondition.atMins" array are invalid, should be in a range of [0-59].`);
					return item;
				})
				.sort((a, b) => a - b); // <-- SORT
		if (data.repeatCondition.atHours)
			data.repeatCondition.atHours = filterUniqueItems(data.repeatCondition.atHours)
				.map((item) => {
					// validate
					if (item < 0 || item > 23)
						throw new Error(`Values in "repeatCondition.atHours" array are invalid, should be in a range of [0-23].`);
					return item;
				})
				.sort((a, b) => a - b); // <-- SORT
		if (data.repeatCondition.atDays)
			data.repeatCondition.atDays = filterUniqueItems(data.repeatCondition.atDays)
				.map((item) => {
					// validate
					if (item < 1 || item > 31)
						throw new Error(`Values in "repeatCondition.atDays" array are invalid, should be in a range of [1-31].`);
					return item;
				})
				.sort((a, b) => a - b); // <-- SORT
		if (data.repeatCondition.atMonths)
			data.repeatCondition.atMonths = filterUniqueItems(data.repeatCondition.atMonths)
				.map((item) => {
					// validate
					if (item < 0 || item > 11)
						throw new Error(`Values in "repeatCondition.atMonths" array are invalid, should be in a range of [0-11].`);
					return item;
				})
				.sort((a, b) => a - b); // <-- SORT
		if (data.repeatCondition.atWeekDays)
			data.repeatCondition.atWeekDays = sortedDaysOfWeek(
				filterUniqueItems(data.repeatCondition.atWeekDays).map((item) => {
					// validate
					if (!weekDays.includes(item))
						throw new Error(`Values in "repeatCondition.atWeekDays" array are invalid, should be in a range of [sun-mon-...-fri-sat].`);
					return item;
				})
			);

		// validate end date
		if (data.endDate && dayjs(data.endDate).diff(dayjs()) < 0) throw new Error(`Value of "endDate" must be in the future.`);

		// calculate next run schedule:
		data.nextRunAt = calculateNextRunAt(data, { isDebugging: true });

		// return
		return super.create(data, options);
	}
}

export default CronjobService;
export { CronjobService };
