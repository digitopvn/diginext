import { Body, Post, Route, Security, Tags } from "tsoa/dist";

import type { IUser, IWorkspace } from "@/entities";
import type { IQueryFilter, IQueryOptions, IResponsePagination } from "@/interfaces";
import { respondSuccess } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";

@Tags("Ask AI")
@Route("ask")
export default class AskAiController {
	user: IUser;

	workspace: IWorkspace;

	ownership: Ownership;

	filter: IQueryFilter;

	options: IQueryOptions;

	pagination: IResponsePagination;

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
		const { AIService } = await import("@/services/AIService");
		const aiSvc = new AIService();
		const data = await aiSvc.generateDockerfileByDirectoryStructure(body.directoryStructure, this.options);

		return respondSuccess({ data });
	}
}
