import { existsSync, writeFileSync } from "fs";
import path from "path";

import type { IUser, IWorkspace } from "@/entities";
import type { InputOptions } from "@/interfaces";
import type { Ownership } from "@/interfaces/SystemTypes";
import type { AIDto } from "@/modules/ai/openrouter-api";
import { aiApi } from "@/modules/ai/openrouter-api";
import { getFolderStructure } from "@/plugins/fs-extra";
import { extractTextBetweenBackticks } from "@/plugins/string";

export class AIService {
	/**
	 * Current login user
	 */
	user?: IUser;

	/**
	 * Current active workspace
	 */
	workspace?: IWorkspace;

	/**
	 * Current owner & workspace
	 */
	ownership?: Ownership;

	constructor(ownership?: Ownership) {
		this.ownership = ownership;
	}

	async generateDockerfileByDirectoryStructure(structure: string, options?: Pick<InputOptions, "isDebugging">) {
		if (!structure) throw new Error(`Directory structure (string) is required.`);

		// ask AI to generate a Dockerfile:
		let askMessage = `Act as a code generator tool, based on this directory structure: ${structure}`;
		askMessage += `\nGenerate content of a Dockerfile satisfied these conditions:`;
		// askMessage += "\n- Use single-stage build when you think this is a static html project";
		askMessage += "\n- Use multi-stage if this is a Javascript, TypeScript, Node.js, Rust, Python or Go lang project";
		// askMessage += "\n- In each build stage, pick the right base image with optimal latest tag";
		askMessage += "\n- Use latest tag in FROM";
		// askMessage += "\n- Only copy dotenv file when the input directory structure contains dotenv file.";
		askMessage += "\n- Optimize the container image size, make sure it is as lightweight image size as possible";
		askMessage += `\nDo not include any explanations or markdown in your response`;

		if (options?.isDebugging) console.log("askMessage :>> ", askMessage);

		const dto: AIDto = {
			model: "openai/gpt-3.5-turbo",
			messages: [
				{
					role: "system",
					content: "You are a helpful code generator tool.",
				},
				{
					role: "user",
					content: askMessage,
				},
			],
		};

		const response = await aiApi({ data: dto });
		// console.log("response :>> ", response);

		// write it down into a file:
		const { content } = response.choices[0].message;
		// if (options?.isDebugging) console.log("generateDockerfile() > content :>> ", content);

		let dockerfileContent = extractTextBetweenBackticks(content);
		return dockerfileContent;
	}

	async generateDockerfile(dir: string = process.cwd(), options?: Pick<InputOptions, "isDebugging">) {
		if (!existsSync(dir)) throw new Error(`Directory not existed.`);

		// scan directory for file structure:
		const filesInStr = await getFolderStructure(dir);

		// ask AI to generate:
		const dockerfileContent = await this.generateDockerfileByDirectoryStructure(filesInStr, options);

		if (options?.isDebugging) console.log("generateDockerfile() > dockerfileContent :>> ", dockerfileContent);
		writeFileSync(path.resolve(dir, `Dockerfile.generated`), dockerfileContent, "utf8");

		return dockerfileContent;
	}
}
