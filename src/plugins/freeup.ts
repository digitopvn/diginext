import execa from "execa";

export async function freeUp() {
	return execa.command(`docker rmi $(docker images "asia.gcr.io/*")`, { stdio: "inherit" });
}
