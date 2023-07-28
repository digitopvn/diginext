import type { InputOptions } from "@/interfaces";
import { AIService } from "@/services/AIService";

export const testCommand = async (options?: InputOptions) => {
	// ----- PULL or CLONE GIT REPO -----
	// const git = simpleGit(process.cwd());
	// const remotes = ((await git.getRemotes(true)) || []).filter((remote) => remote.name === "origin");
	// console.log("remotes :>> ", remotes);
	// const originRemote = remotes[0] as any;
	// if (!originRemote) throw new Error(`This directory doesn't have any git remotes.`);
	// console.log("originRemote :>> ", originRemote);
	// ---- GENERATE SSH KEY ----
	// const { execa, execaCommand } = await import("execa");
	// const privateIdRsaFile = "id_rsa";
	// await execa("ssh-keygen", ["-b", "2048", "-t", "rsa", "-f", privateIdRsaFile, "-q", "-N", ""]);
	// ---> Build 10 apps in the same time!!!
	// await cliAuthenticate(options);
	// for (let i = 0; i < 10; i++) {
	// 	console.log("Build :>> ", i + 1);
	// 	await requestBuild(options);
	// 	await wait(1000);
	// }
	// ----- GET LATEST TAG -----
	// console.log(await getLatestTagOfGitRepo());
	// ----- PULL HTTP GIT ------
	// await pullOrCloneGitRepoHTTP(
	// 	"https://bitbucket.org/digitopvn/static-site-framework.git",
	// 	path.resolve(HOME_DIR, "static-site-framework"),
	// 	"master",
	// 	{
	// 		isDebugging: true,
	// 		useAccessToken: {
	// 			type: "Basic",
	// 			value: "<your-base64-token>",
	// 		},
	// 	}
	// );

	const aiSvc = new AIService();
	await aiSvc.generateDockerfile(options.targetDirectory, options);
};
