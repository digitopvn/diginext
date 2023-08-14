import puppeteer from "puppeteer";

export interface TrendingRepository {
	name: string;
	url: string;
	stars: number;
	language: string;
}

export interface GithubTrendOptions {
	/**
	 * Programming language
	 * @example "typescript", "go", "rust", "python",...
	 */
	lang?: string;
	/**
	 * Date range.
	 * @default "daily"
	 */
	time?: "daily" | "weekly" | "monthly";
}

export async function fetchTrendingRepos(options?: GithubTrendOptions): Promise<TrendingRepository[]> {
	const browser = await puppeteer.launch({
		headless: "new",
		executablePath: process.env.CHROMIUM_PATH,
		args: [
			"--no-sandbox",
			"--disable-dev-shm-usage", // <-- add this one
		],
	});
	const page = await browser.newPage();
	const githubTrendUrl = `https://github.com/trending${options?.lang ? `/${options?.lang}` : ""}?since=${options?.time || "daily"}`;
	console.log("githubTrendUrl :>> ", githubTrendUrl);
	await page.goto(githubTrendUrl);

	const repos = await page.$$eval(".Box-row", (rows) => {
		return rows.map((row) => {
			const nameElement = row.querySelector("h2.h3");
			const starElement = row.querySelector("span.d-inline-block.float-sm-right");
			const languageElement = row.querySelector('[itemprop="programmingLanguage"]');

			const name = ((nameElement?.textContent?.trim() as string) || "").replace(/\n| /gi, "");
			const url = `https://github.com${nameElement?.querySelector("a")?.getAttribute("href") || ""}`;
			const starsString = starElement?.textContent?.trim().replace(/,/g, "") || "";
			const stars = parseInt(starsString, 10) || 0;
			const language = languageElement?.textContent?.trim() || "";

			return { name, url, stars, language };
		});
	});
	// console.log("repos :>> ", repos);

	await browser.close();
	return repos as TrendingRepository[];
}
