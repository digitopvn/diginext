// import updateBranchProtection from "@/modules/git/updateBranchProtection";
// import updateRepoSetting from "@/modules/git/updateRepoSetting";
// import axios from "axios";
// const dotenv = require("dotenv").config({ path: ".env.test" });
// const _env = dotenv.parsed ? dotenv.parsed : {};

// function getRepoName(url: string): string | null {
// 	// Regular expression to match the GitHub repository pattern
// 	// This regex assumes the standard GitHub URL format: https://github.com/username/reponame
// 	const regex = /https:\/\/github\.com\/[^\/]+\/([^\/]+)/;

// 	// Matching the URL against the regex
// 	const match = url.match(regex);

// 	// Returning the repository name if a match is found
// 	return match ? match[1] : null;
// }

// function getRepoOwner(url: string): string | null {
// 	// Regular expression to match the GitHub repository pattern
// 	// This regex assumes the standard GitHub URL format: https://github.com/username/reponame
// 	const regex = /https:\/\/github\.com\/([^\/]+)\/[^\/]+/;

// 	// Matching the URL against the regex
// 	const match = url.match(regex);

// 	// Returning the owner's username if a match is found
// 	return match ? match[1] : null;
// }

// it("updateBranchProtech.test.ts", async () => {
// 	const token = _env.GITHUB_TOKEN;
// 	console.log("token :>> ", token);
// 	if (!token) throw new Error("NO GITHUB_TOKEN");

// 	let maxPage = 3;
// 	for (let k = 1; k <= 3; k++) {
// 		const res = await axios({
// 			method: "get",
// 			url: `https://api.github.com/search/repositories?q=user:digitopvn&per_page=100&page=${k}`,
// 			headers: {
// 				Accept: "application/vnd.github+json",
// 				Authorization: `token ${token}`,
// 				//
// 			},
// 		});

// 		const { total_count, items } = (res as any)?.data;
// 		maxPage = Math.ceil(total_count / 100);
// 		const list = items.filter((x) => x.private);

// 		for (let i = 0; i < list.length; i++) {
// 			const element = list[i];

// 			const option: any = {
// 				// options.app.git
// 				app: { git: { provider: "github" } },
// 				git: {
// 					org: getRepoOwner(element.html_url),
// 					access_token: token,
// 				} as any,
// 				repoSlug: getRepoName(element.html_url),
// 				defaultBranch: element.default_branch,
// 			};

// 			console.log("element.html_url :>> ", element.html_url);
// 			// const ress = await updateBranchProtection(option);
// 			const ress = await updateRepoSetting(option);
// 		}
// 	}
// }, 1000000);

// // nothing, just because Jest will not work without exporting something
export {};
