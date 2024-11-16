import mongoose, { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export interface IEnvVar extends IBase {
	name: string;
	value: string;
	description?: string;
	env?: string;
	appId?: string;
}
export type EnvVarDto = Omit<IEnvVar, keyof HiddenBodyKeys>;

export const envVarSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		value: { type: String },
		description: { type: String },
		env: { type: String },
		appId: { type: String, ref: "apps" },
	},
	{ collection: "env_vars", timestamps: true }
);

export const EnvVarModel = mongoose.model("EnvVar", envVarSchema, "env_vars");
