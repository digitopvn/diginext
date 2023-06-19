import type { IMedia } from "@/entities/Media";
import { mediaSchema } from "@/entities/Media";

import BaseService from "./BaseService";

export default class MediaService extends BaseService<IMedia> {
	constructor() {
		super(mediaSchema);
	}
}
export { MediaService };
