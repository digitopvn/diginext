import { printHelp } from "../../plugins/utils";
import { askForProjectAndApp } from "../apps/ask-project-and-app";
import { signInBitbucket } from "../bitbucket";
import { bitbucketAuthentication } from "../bitbucket/promptForAuthOptions";
import { createAnalyticsProperty, getAnalyticsAccount } from "./analytics.service";

export async function execAnalytics(options) {
	options = await bitbucketAuthentication(options);

	await signInBitbucket(options);

	if (typeof options.targetDirectory == "undefined") options.targetDirectory = process.cwd();

	// await createAnalyticsAccount("digitop.vn");
	if (options.secondAction) {
		switch (options.secondAction) {
			case "list":
				await getAnalyticsAccount();
				break;

			case "new":
				const trackingName = options.thirdAction;
				const trackingUrl = options.fourAction;
				const { app } = await askForProjectAndApp(options.targetDirectory, options);
				await createAnalyticsProperty(app, { env: options.env, name: trackingName, url: trackingUrl });
				break;

			default:
				break;
		}
	} else {
		printHelp();
	}
	return options;
}
