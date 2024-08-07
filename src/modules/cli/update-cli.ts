import { progressCmd } from "../../plugins";

/**
 * Update current CLI version
 */
export const updateCli = async (version = "latest", options?: { isDebugging?: boolean }) => {
	if (version) {
		await progressCmd(`npm i @topgroup/diginext@${version} --location=global`, { isDebugging: options?.isDebugging });
	} else {
		await progressCmd(`npm update @topgroup/diginext --location=global`, { isDebugging: options?.isDebugging });
	}
	return true;
};
