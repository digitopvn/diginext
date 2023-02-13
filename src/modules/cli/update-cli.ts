import { execCmd } from "../../plugins";

/**
 * Update current CLI version
 */
export const updateCli = async (version = "latest") => {
	if (version) {
		await execCmd(`npm i @topgroup/diginext@${version} --location=global`);
	} else {
		await execCmd(`npm update @topgroup/diginext --location=global`);
	}
	return true;
};
