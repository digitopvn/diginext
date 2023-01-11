import chalk from "chalk";

import { getCliConfig } from "@/config/config";
import type { AppConfig } from "@/interfaces/AppConfig";

export function printInformation(finalConfig: AppConfig) {
	const { buildServerUrl } = getCliConfig();

	console.log(chalk.yellow("-----------------------------------------------------------"));
	console.log(chalk.yellow("    Congratulations! You are all set. Happy coding!"));
	console.log(chalk.yellow("-----------------------------------------------------------"));

	if (finalConfig.git.repoURL) console.log(chalk.green.bold("Repo URL   : ") + chalk.cyan(finalConfig.git.repoURL));
	if (finalConfig.git.repoSSH) console.log(chalk.green.bold("Remote SSH : ") + chalk.cyan(finalConfig.git.repoSSH));

	console.log(chalk.green.bold("Framework  : ") + chalk.cyan(finalConfig.framework.name));
	console.log(chalk.green.bold("Version    : ") + chalk.cyan(finalConfig.framework.version));

	// Deploy instruction:
	console.log(chalk.yellow("-----------------------------------------------------------"));
	console.log(chalk.green.bold("To deploy DEV  : ") + chalk.cyan(`di deploy`));
	console.log(chalk.green.bold("To deploy PROD : "));
	console.log(chalk.green("  1 - Add your domain to according `environment` in `dx.json`"));
	console.log(chalk.green("  2 - Create/modify ENV variables at: ") + chalk.cyan(`deployment/.env.<environment>`));
	console.log(chalk.green("  3 - Deploy to server with: ") + chalk.cyan(`di deploy --env=<environment>`));
	console.log(chalk.green("      (Use flag " + chalk.cyan("--debug") + " if you want to see the build progress)"));
	console.log(chalk.green("  4 - Preview & roll out the deployment at: ") + chalk.cyan(buildServerUrl));
	console.log(chalk.yellow("-----------------------------------------------------------"));
	console.log(chalk.green("More instruction, type: ") + chalk.cyan(`di --help`));
	console.log(chalk.yellow("-----------------------------------------------------------"));
}
