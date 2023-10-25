import chalk from "chalk";
import { logWarn } from "diginext-utils/dist/xconsole/log";
import inquirer from "inquirer";

import type { InputOptions } from "@/interfaces";

import { execAI } from "../ai/exec-ai";

/**
 * Prompt a question to ask for Cert Issuer: Let's Encrypt, Custom Issuer or None
 * @param options
 * @returns
 */
export const askAiGenerateDockerfile = async (options: InputOptions) => {
	const { autoDockerfile } = await inquirer.prompt<{ autoDockerfile: boolean }>({
		type: "confirm",
		name: "autoDockerfile",
		message: `Do you want to generate "Dockerfile" using our AI? ${chalk.yellow(
			`(WARNING: this action will overwrite the current "Dockerfile.${options.env}" if any)`
		)}`,
		default: true,
	});

	if (autoDockerfile) {
		try {
			await execAI({ ...options, secondAction: "generate", thirdAction: "dockerfile" });
			logWarn(
				`(Sometime the AI doesn't understand your source code properly, lead to not working Dockerfile, manually write your own Dockerfile is highly recommended for better optimization)`
			);
		} catch (e) {
			logWarn(`Unable to generate Dockerfile (${e})`);
		}
	}
};
