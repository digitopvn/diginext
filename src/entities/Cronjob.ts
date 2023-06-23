import { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { CronjobStatus } from "@/interfaces/SystemTypes";
import { type RequestMethodType, cronjobStatusList, requestMethodList } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export const weekDays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type WeekDay = typeof weekDays[number];

export const cronjobRepeatUnitList = ["minute", "hour", "day", "month", "year"] as const;
export type CronjobRepeatUnit = typeof cronjobRepeatUnitList[number];

export type CronjobRequest = {
	url?: string;
	method?: RequestMethodType;
	params?: Record<string, string>;
	headers?: Record<string, string>;
	body?: any;
};

export type CronjobRepeat = {
	range?: number;
	unit?: CronjobRepeatUnit;
};

export type CronjonRepeatCondition = {
	/**
	 * Array of hours from 0 to 23
	 */
	atHours?: number[];
	/**
	 * Array of minutes from 0 to 59
	 */
	atMins?: number[];
	/**
	 * Array of weekdays
	 */
	atWeekDays?: WeekDay[];
	/**
	 * Array of days from 1 to 31
	 */
	atDays?: number[];
	/**
	 * Array of days from 0 to 11
	 */
	atMonths?: number[];
};

export type CronjobHistory = {
	runAt: Date;
	status: CronjobStatus;
	responseStatus: string | number;
	message: string;
};

export interface ICronjob extends IBase {
	name?: string;
	// api request
	url?: string;
	method?: RequestMethodType;
	params?: Record<string, string>;
	headers?: Record<string, string>;
	body?: any;
	// schedule
	nextRunAt?: Date;
	endDate?: Date;
	repeat?: CronjobRepeat;
	repeatCondition?: CronjonRepeatCondition;
	// history
	history?: CronjobHistory[];
}
export type CronjobDto = Omit<ICronjob, keyof HiddenBodyKeys>;

export const cronjobSchema = new Schema<ICronjob>(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		// api request
		url: String,
		method: { type: String, enum: requestMethodList },
		params: Object,
		body: Object,
		headers: Object,
		// schedule
		nextRunAt: Date,
		endDate: Date,
		repeat: {
			range: Number,
			unit: { type: String, enum: cronjobRepeatUnitList },
		},
		repeatCondition: {
			atHours: [Number],
			atMins: [Number],
			atWeekDays: [{ type: String, enum: weekDays }],
			atDays: [Number],
			atMonths: [Number],
		},
		history: [{ runAt: Date, status: { type: String, enum: cronjobStatusList }, responseStatus: Schema.Types.Mixed, message: String }],
	},
	{ collection: "cronjobs", timestamps: true }
);
