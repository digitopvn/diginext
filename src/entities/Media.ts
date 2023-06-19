import { Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export const mediaMimes = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
export type MediaMime = typeof mediaMimes[number];

export interface IMedia extends IBase {
	name: string;
	mime: MediaMime;
	url: string;
	path?: string;
}
export type MediaCreateDto = Omit<IMedia, keyof HiddenBodyKeys>;
export type MediaUpdateDto = Partial<MediaCreateDto>;

export const mediaSchema = new Schema(
	{
		...baseSchemaDefinitions,
		name: { type: String, required: true },
		mime: { type: String, enum: mediaMimes },
		url: { type: String },
		path: { type: String },
		app: { type: Schema.Types.ObjectId, ref: "apps" },
		project: { type: Schema.Types.ObjectId, ref: "projects" },
		owner: { type: Schema.Types.ObjectId, ref: "users" },
		workspace: { type: Schema.Types.ObjectId, ref: "workspaces" },
	},
	{ collection: "medias", timestamps: true }
);
