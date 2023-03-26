export function getOS() {
	const osvar = process.platform;
	if (osvar == "darwin") {
		return "mac";
	} else if (osvar == "win32") {
		return "win";
	} else if (osvar == "linux") {
		return "linux";
	} else {
		return osvar;
	}
}

export function isWin() {
	const osvar = process.platform;
	return osvar == "win32";
}

export function isMac() {
	const osvar = process.platform;
	return osvar == "darwin";
}

export function isLinux() {
	const osvar = process.platform;
	return osvar == "darwin";
}
