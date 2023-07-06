import { progressCmd } from "../../plugins";

/**
 * Update current CLI version
 */
export const updateCli = async (version = "latest") => {
	if (version) {
		await progressCmd(`npm i @topgroup/diginext@${version} --location=global`, { isDebugging: true });
	} else {
		await progressCmd(`npm update @topgroup/diginext --location=global`, { isDebugging: true });
	}
	return true;
};
