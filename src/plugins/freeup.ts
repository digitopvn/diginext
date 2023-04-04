import { cleanUp } from "@/build/system";

export async function freeUp() {
	// return execa.command(`docker rmi $(docker images "asia.gcr.io/*")`, { stdio: "inherit" });
	await cleanUp();
	return true;
}
