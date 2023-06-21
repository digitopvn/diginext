import { cleanUp } from "@/build/system";

export async function freeUp() {
	// return execaCommand(`docker rmi $(docker images "asia.gcr.io/*")`, { stdio: "inherit" });
	await cleanUp();
	return true;
}
