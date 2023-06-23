import chalk from "chalk";
import dayjs from "dayjs";

import type { ICronjob } from "@/entities/Cronjob";
import { weekDays } from "@/entities/Cronjob";
import { sortedDaysOfWeek } from "@/plugins/array";

export const calculateNextRunAt = (job: ICronjob, options?: { isDebugging?: boolean }) => {
	let nextRunAt: Date | undefined;

	if (options?.isDebugging) {
		console.log("------------------------------------");
		console.log("Calculating next run :>> current date:");
		console.log(`- Year:   ${dayjs().year()}`);
		console.log(`- Month:  ${dayjs().month()}`);
		console.log(`- Date:   ${dayjs().date()}`);
		console.log(`- Hour:   ${dayjs().hour()}`);
		console.log(`- Minute: ${dayjs().minute()}`);
		console.log(`- In mins:     [${job.repeatCondition?.atMins?.join(", ") || " "}]`);
		console.log(`- In hours:    [${job.repeatCondition?.atHours?.join(", ") || " "}]`);
		console.log(`- In days:     [${job.repeatCondition?.atDays?.join(", ") || " "}]`);
		console.log(`- In months:   [${job.repeatCondition?.atMonths?.join(", ") || " "}]`);
		console.log(`- In weekdays: [${job.repeatCondition?.atWeekDays?.join(", ") || " "}]`);
	}
	let _nextDate = dayjs().add(job.repeat.range, job.repeat.unit);

	if (job.repeat && job.repeat.range && job.repeat.unit) {
		// repeat condition:
		/**
		 * Examples:
		 * ✓ Every month (monthly), at [weekdays: "mon", "tue", "fri"]
		 * ✓ Every day (daily), at [weekdays: "mon", "tue", "fri"]
		 * ✓ Every 5 minutes, at [hours: 13,14,18]
		 * ✓ Every 2 hours, at [minutes: 5,10] and [weekdays: mon,wed,thu,sat]
		 */
		if (job.repeatCondition?.atMins?.length > 0 && !job.repeatCondition?.atMins.includes(_nextDate.minute())) {
			const validMins = job.repeatCondition?.atMins.sort((a, b) => a - b);
			const nextMin = validMins.filter((min) => min > _nextDate.minute())[0];
			if (nextMin) {
				_nextDate = _nextDate.set("minute", nextMin);
			} else {
				_nextDate = _nextDate.add(1, "hour").set("minute", validMins[0]);
			}
		}
		if (job.repeatCondition?.atHours?.length > 0 && !job.repeatCondition?.atHours.includes(_nextDate.hour())) {
			const validHours = job.repeatCondition?.atHours.sort((a, b) => a - b);
			const nextHour = validHours.filter((hour) => hour > _nextDate.hour())[0];
			if (nextHour) {
				_nextDate = _nextDate.set("hour", nextHour);
			} else {
				_nextDate = _nextDate.add(1, "day").set("hour", validHours[0]);
			}
		}
		if (job.repeatCondition?.atDays?.length > 0 && !job.repeatCondition?.atDays.includes(_nextDate.date())) {
			const validDays = job.repeatCondition?.atDays.sort((a, b) => a - b);
			const nextDay = validDays.filter((day) => day > _nextDate.date())[0];
			if (nextDay) {
				_nextDate = _nextDate.set("date", nextDay);
			} else {
				_nextDate = _nextDate.add(1, "month").set("date", validDays[0]);
			}
		}
		if (job.repeatCondition?.atMonths?.length > 0 && !job.repeatCondition?.atMonths.includes(_nextDate.month())) {
			const validMonths = job.repeatCondition?.atMonths.sort((a, b) => a - b);
			const nextMonth = validMonths.filter((month) => month > _nextDate.month())[0];
			if (nextMonth) {
				_nextDate = _nextDate.set("month", nextMonth);
			} else {
				_nextDate = _nextDate.add(1, "year").set("month", validMonths[0]);
			}
		}
		if (job.repeatCondition?.atWeekDays?.length > 0 && !job.repeatCondition?.atWeekDays.includes(weekDays[_nextDate.day()])) {
			const validWeekdays = sortedDaysOfWeek(job.repeatCondition?.atWeekDays);
			const nextWeekday = validWeekdays.filter((weekday, index) => index > validWeekdays.indexOf(weekDays[_nextDate.day()]))[0];
			if (nextWeekday) {
				_nextDate = _nextDate.set("day", weekDays.indexOf(nextWeekday));
			} else {
				_nextDate = _nextDate.add(1, "week").set("day", weekDays.indexOf(validWeekdays[0]));
			}
		}

		// check end date

		nextRunAt = job.endDate && _nextDate.diff(dayjs(job.endDate)) > 0 ? undefined : _nextDate.toDate();
	}

	if (options?.isDebugging) {
		console.log(`=> NEXT RUN AT: ${chalk.yellow(_nextDate.format("llll"))}`);
		console.log("------------------------------------");
	}

	return nextRunAt;
};
