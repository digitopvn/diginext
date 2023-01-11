import inquirer from "inquirer";
import open from "open";

import type InputOptions from "@/interfaces/InputOptions";

// import { wait } from "@/plugins";
import { conf } from "../..";

export async function bitbucketAuthentication(options: InputOptions) {
	const questions = [];

	if (conf.get("username")) options.username = conf.get("username");
	if (conf.get("code")) options.code = conf.get("code");
	if (conf.get("token")) options.token = conf.get("token");
	if (conf.get("refreshToken")) options.refreshToken = conf.get("refreshToken");

	if (!options.username) {
		const { username } = await inquirer.prompt({
			type: "input",
			name: "username",
			message: "Điền username hoặc email Bitbucket của bạn:",
			validate: function (value) {
				if (value.length) {
					return true;
				} else {
					return "Điền username hoặc e-mail đăng nhập Bitbucket.";
				}
			},
		});
		options.username = username;
	}

	if (!options.code) {
		await open("https://bitbucket.org/site/oauth2/authorize?client_id=s37Euc285LFVkMWfQh&response_type=code");

		// await wait(3000);

		const { code } = await inquirer.prompt({
			// type: "password",
			name: "code",
			message: `Điền token code của Bibucket:`,
			validate: function (value) {
				if (value.length) {
					return true;
				} else {
					return "Điền token code của Bibucket.";
				}
			},
		});

		options.code = code;
	}

	return options;
}
