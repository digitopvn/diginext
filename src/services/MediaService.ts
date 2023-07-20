import type { IMedia } from "@/entities/Media";
import { mediaSchema } from "@/entities/Media";
import type { Ownership } from "@/interfaces/SystemTypes";

import BaseService from "./BaseService";

export default class MediaService extends BaseService<IMedia> {
	constructor(ownership?: Ownership) {
		super(mediaSchema, ownership);
	}
}
export { MediaService };
