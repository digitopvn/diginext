import { generateDeployment } from "@/modules/deploy";
import { app } from "@/server";
import { env } from "yargs";

describe("generateDeployment.test", async () => {
	//

	// unattach volume from the K8S deployment
	const deployment = await await generateDeployment({
		appSlug: "simplenode",
		env: "dev",
		username: "tam-lam",
		workspace: { slug: "topgroup" },
		buildTag: "simplenode-v0-24-0-76",
	});
	console.log("deployment :>> ", deployment);
});

// nothing, just because Jest will not work without exporting something
export {};
