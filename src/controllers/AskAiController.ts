import { Body, Get, Post, Route, Security, Tags } from "tsoa/dist";

import type { IUser, IWorkspace } from "@/entities";
import type { IQueryFilter, IQueryOptions, IResponsePagination } from "@/interfaces";
import { respondSuccess } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import { AIService } from "@/services/AIService";

@Tags("Ask AI")
@Route("ask")
export default class AskAiController {
	user: IUser;

	workspace: IWorkspace;

	ownership: Ownership;

	service: AIService = new AIService();

	filter: IQueryFilter;

	options: IQueryOptions;

	pagination: IResponsePagination;

	@Security("api_key")
	@Security("jwt")
	@Get("/")
	async get() {
		return respondSuccess({ msg: "Ask AI" });
	}

	/**
	 * Ask AI to generate a Dockerfile
	 */
	@Security("api_key")
	@Security("jwt")
	@Post("/generate/dockerfile")
	async generateDockerfile(
		@Body()
		body: {
			/**
			 * Directory structure in string
			 */
			directoryStructure: string;
		}
	) {
		const data = await this.service.generateDockerfileByDirectoryStructure(body.directoryStructure, this.options);

		return respondSuccess({ data });
	}
}
