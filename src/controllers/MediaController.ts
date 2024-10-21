import { Body, Post, Route, Security, Tags } from "tsoa/dist";

import type { IMedia } from "@/entities/Media";
import MediaService from "@/services/MediaService";

import BaseController from "./BaseController";

@Tags("Media")
@Route("media")
export default class MediaController extends BaseController<IMedia, MediaService> {
	constructor() {
		super(new MediaService());
	}

	@Security("api_key")
	@Security("jwt")
	@Post("/upload-to-cloud-storage")
	async uploadToCloudStorage(@Body() body: { file: Buffer; fileName: string }) {
		return this.service.uploadToCloudStorage(body.file, body.fileName);
	}
}
