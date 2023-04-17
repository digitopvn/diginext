import { model, Schema } from "mongoose";

import type { HiddenBodyKeys } from "@/interfaces";
import type { GitProviderType } from "@/interfaces/SystemTypes";
import { availableGitProviders } from "@/interfaces/SystemTypes";

import type { IBase } from "./Base";
import { baseSchemaDefinitions } from "./Base";

export interface IGitProvider extends IBase {
	name?: string;
	host?: string;
	gitWorkspace?: string;
	repo?: {
		url?: string;
		sshPrefix?: string;
	};
	type?: GitProviderType;
}
export type GitProviderDto = Omit<IGitProvider, keyof HiddenBodyKeys>;

export const gitProviderSchema = new Schema<IGitProvider>(
	{
		...baseSchemaDefinitions,
		name: { type: String },
		host: { type: String },
		gitWorkspace: { type: String },
		repo: {
			url: { type: String },
			sshPrefix: { type: String },
		},
		type: { type: String, enum: availableGitProviders },
	},
	{ collection: "git_providers", timestamps: true }
);

export const GitProviderModel = model<IGitProvider>("GitProvider", gitProviderSchema, "git_providers");
