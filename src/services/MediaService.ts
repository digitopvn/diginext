import type { IMedia } from "@/entities/Media";
import { mediaSchema } from "@/entities/Media";
import type { Ownership } from "@/interfaces/SystemTypes";
import { uploadFileBuffer } from "@/plugins/cloud-storage";

import BaseService from "./BaseService";

export default class MediaService extends BaseService<IMedia> {
	constructor(ownership?: Ownership) {
		super(mediaSchema, ownership);
	}

	async uploadToCloudStorage(file: Buffer, fileName: string) {
		const { workspace } = this.ownership;

		if (!workspace) throw new Error("Workspace not found");
		if (!workspace.settings.cloud_storage) throw new Error("Cloud storage settings not found");

		return uploadFileBuffer(file, fileName, { storage: workspace.settings.cloud_storage });
	}
}

export { MediaService };
