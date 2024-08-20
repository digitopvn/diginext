import chalk from "chalk";
import { logError, logSuccess } from "diginext-utils/dist/xconsole/log";
import { writeFileSync } from "fs";
import inquirer from "inquirer";
import path from "path";
import yargs from "yargs";

import type { InputOptions } from "@/interfaces";
import { getSourceTree } from "@/plugins/fs-extra";

import type { AskAiMessage } from "../diginext/dx-ask-ai";
import { dxAskAi } from "../diginext/dx-ask-ai";

export async function execAI(options?: InputOptions) {
	const { secondAction: action, thirdAction: resource, env, workspace, isDebugging } = options;
	if (!options.targetDirectory) options.targetDirectory = process.cwd();

	switch (action) {
		case "generate":
			switch (resource) {
				case "dockerfile":
					try {
						const directoryStructure = await getSourceTree(options.targetDirectory);

						const model = "meta-llama/llama-3.1-70b-instruct";
						const messages: AskAiMessage[] = [
							{
								role: "system",
								content:
									"You are a master of Dockerfile composer. You will ask up to 5 questions based on the given source code structure to be able to return a Dockerfile to build a project.",
							},
							{
								role: "user",
								content: `Generate a list of questions based on this source code structure to be able to create a Dockerfile:
								<source_code_structure>
								${directoryStructure}
								</source_code_structure>
								Follow these instructions:
								<instructions>
								- Predict the programming language, framework, database.
								- Respond a plain JSON string strictly follow the response_json_template below.
								- Do not use markdown format
								- Do not include backticks
								- Do not include any explaination in your response.
								</instructions>
								<response_json_template>
								{ "questions": [ "<question_1>", "<question_2>", ... , "<question_5>" ] }
								</response_json_template>`,
							},
						];
						const response = await dxAskAi({ model, messages }, workspace.dx_key, { isDebugging: true });

						if (options.isDebugging) {
							console.log("execAI() > result :>> ");
							console.dir(response, { depth: 10 });
						}

						if (options?.isDebugging) console.dir(response, { depth: 10 });

						// push assistant questions
						messages.push(response.data.choices[0].message);

						const questions = JSON.parse(response.data.choices[0].message.content);
						const answers: string[] = [];
						for (const question of questions.questions) {
							const { answer } = await inquirer.prompt<{ answer: string }>({
								type: "input",
								name: "answer",
								message: question,
							});
							answers.push(answer);
						}
						if (options?.isDebugging) console.log("answers :>> ", answers);

						// push user answers
						messages.push({
							role: "user",
							content: `Generate a Dockerfile based on these answers:\n${answers.map((a, i) => `[${i + 1}] ${a}`).join("\n")}
							<instructions>
								- Use multi stages to optimize the image size and speed up the build process.
								- Respond a plain text of a generated Dockerfile content.
								- Do not use markdown format
								- Do not include backticks
								- Do not include any explaination in your response.
							</instructions>`,
						});

						// generate a dockerfile
						const response2 = await dxAskAi({ model, messages }, workspace.dx_key, { isDebugging: true });
						if (options?.isDebugging) console.dir(response2, { depth: 10 });

						const dockerfileContent = response2.data.choices[0].message.content;
						if (options?.isDebugging) console.log(`Dockerfile :>>\n`, dockerfileContent);
						writeFileSync(path.resolve(options.targetDirectory, `Dockerfile.${env}`), dockerfileContent, "utf8");

						// if (!response.status) logError(response.messages[0] || `Unable to call Diginext API.`);
						// if (options?.isDebugging) console.log("execAI() > requestResult.data :>> ", response.data);

						// const dockerfileContent = response?.data;
						// writeFileSync(path.resolve(options.targetDirectory, `Dockerfile.${env}`), dockerfileContent, "utf8");

						// log success
						const dockerfileName = `./Dockerfile.${env}`;
						logSuccess(`Congrats! Your "${chalk.cyan(dockerfileName)}" has been generated successfully.`);
					} catch (e) {
						throw new Error(`Unable to call Diginext API: ${e}`);
					}
					break;

				default:
					yargs.showHelp();
					break;
			}
			break;

		default:
			logError(`Invalid CLI action: "${action}"`);
			break;
	}
}
